import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, addDoc, setDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { AppUser } from '../types';
import { logActivity, handleFirestoreError, OperationType } from './utils';

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
  const unsubRef = React.useRef<(() => void) | null>(null);
  const sessionDocIdRef = React.useRef<string | null>(null);

  const getDeviceId = () => {
    let id = localStorage.getItem('dalia_device_id');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('dalia_device_id', id);
    }
    return id;
  };

  const registerDevice = async (userData: AppUser) => {
    const deviceId = getDeviceId();
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const userAgent = navigator.userAgent;
    const platform = (navigator as any).platform || 'Unknown';
    
    // Improved device detection logic
    let deviceName = 'Perangkat Tidak Dikenal';
    let platformName = platform;

    if (/android/i.test(userAgent)) {
      deviceName = 'Android Device';
      platformName = 'Android';
    } else if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      if (/iPad/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        deviceName = 'iPad';
      } else {
        deviceName = 'iPhone';
      }
      platformName = 'iOS/iPadOS';
    } else if (/Windows/i.test(userAgent)) {
      deviceName = 'Windows PC';
      platformName = 'Windows';
    } else if (/Macintosh/i.test(userAgent)) {
      deviceName = 'MacBook/iMac';
      platformName = 'macOS';
    } else if (/Linux/i.test(userAgent)) {
      deviceName = 'Linux PC';
      platformName = 'Linux';
    }

    try {
      const q = query(
        collection(db, 'device_sessions'), 
        where('deviceId', '==', deviceId),
        where('userId', '==', userData.id)
      );
      const snapshot = await getDocs(q);
      
      const sessionData = {
        userId: userData.id,
        username: userData.username,
        displayName: userData.displayName,
        deviceId,
        deviceName,
        platform: platformName,
        userAgent,
        isInstalled,
        lastActive: new Date().toISOString(),
        revoked: false
      };

      let docId = '';
      if (snapshot.empty) {
        const newDoc = await addDoc(collection(db, 'device_sessions'), sessionData);
        docId = newDoc.id;
        // Log new device registration
        await logActivity(userData, 'Register Device', `Perangkat baru terdaftar: ${deviceName} (${platformName})`, 'info');
      } else {
        docId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'device_sessions', docId), sessionData);
      }
      
      sessionDocIdRef.current = docId;

      // Listen for real-time revocation
      const unsub = onSnapshot(doc(db, 'device_sessions', docId), (docSnap) => {
        if (docSnap.exists() && docSnap.data().revoked) {
          logout();
        }
      });

      return unsub;
    } catch (error) {
      console.error('Error registering device:', error);
      handleFirestoreError(error, OperationType.WRITE, 'device_sessions');
      return () => {};
    }
  };

  const checkDeviceRevoked = async (userData: AppUser) => {
    const deviceId = getDeviceId();
    try {
      const q = query(
        collection(db, 'device_sessions'), 
        where('deviceId', '==', deviceId),
        where('userId', '==', userData.id),
        where('revoked', '==', true)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        logout();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking device revocation:', error);
      handleFirestoreError(error, OperationType.GET, 'device_sessions');
      return false;
    }
  };

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
          const userData = JSON.parse(savedUser);
          const isRevoked = await checkDeviceRevoked(userData);
          if (!isRevoked) {
            setUser(userData);
            registerDevice(userData).then(unsub => {
              unsubRef.current = unsub;
            });
          }
        }
        setLoading(false);
        console.log('Auth init finished.');
      }
    };
    init();
  }, []);

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!user || !sessionDocIdRef.current) return;

    const interval = setInterval(async () => {
      try {
        await updateDoc(doc(db, 'device_sessions', sessionDocIdRef.current!), {
          lastActive: new Date().toISOString()
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 60000); // Every 1 minute

    return () => clearInterval(interval);
  }, [user]);

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
        const unsub = await registerDevice(userData);
        unsubRef.current = unsub;
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
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    sessionDocIdRef.current = null;
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
