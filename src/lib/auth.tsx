import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, addDoc, setDoc, doc, updateDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { AppUser } from '../types';
import { logActivity } from './utils';

interface AuthContextType {
  user: AppUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize master admin
  useEffect(() => {
    const init = async () => {
      console.log('Auth init started...');
      try {
        const q = query(collection(db, 'users'), where('username', '==', 'Dalia'));
        console.log('Querying master admin...');
        const snapshot = await getDocs(q);
        console.log('Query result:', snapshot.empty ? 'empty' : 'found');
        
        if (snapshot.empty) {
          console.log('Creating master admin...');
          await addDoc(collection(db, 'users'), {
            username: 'Dalia',
            password: '17112020alfi',
            role: 'admin',
            displayName: 'Admin Utama',
            createdAt: new Date().toISOString()
          });
          console.log('Master admin created.');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        // Check session storage for session
        const savedUser = sessionStorage.getItem('dalia_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        setLoading(false);
        console.log('Auth init finished.');
      }
    };
    init();
  }, []);

  const login = async (username: string, password: string) => {
    console.log('Login attempt for:', username);
    try {
      const q = query(
        collection(db, 'users'), 
        where('username', '==', username),
        where('password', '==', password)
      );
      console.log('Querying user...');
      const snapshot = await getDocs(q);
      console.log('Login query result:', snapshot.empty ? 'empty' : 'found');
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = { 
          id: userDoc.id, 
          ...userDoc.data()
        } as unknown as AppUser;
        
        setUser(userData);
        sessionStorage.setItem('dalia_user', JSON.stringify(userData));
        await logActivity(userData, 'Login', 'Pengguna berhasil masuk ke aplikasi', 'success');
        console.log('Login successful.');
        return true;
      }
      console.log('Login failed: user not found or password incorrect.');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    if (user) {
      await logActivity(user, 'Logout', 'Pengguna keluar dari aplikasi', 'info');
    }
    setUser(null);
    sessionStorage.removeItem('dalia_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
