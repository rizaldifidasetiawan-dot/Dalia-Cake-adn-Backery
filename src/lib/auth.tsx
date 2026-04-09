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

    // Try to extract more specific device info from User Agent
    const ua = userAgent;
    
    if (/android/i.test(ua)) {
      platformName = 'Android';
      // Extract Android model - more robust regex
      // Handles: "Android 10; SM-G973F", "Android 12; Redmi Note 11", etc.
      const match = ua.match(/Android\s+[^;]+;\s+([^;Build/)]+)/i);
      if (match && match[1] && match[1].trim().length > 1) {
        deviceName = `Android: ${match[1].trim()}`;
      } else {
        // Fallback for other Android UA formats
        const altMatch = ua.match(/Android\s+[0-9.]+;\s*([^;)]+)/i);
        if (altMatch && altMatch[1]) {
          deviceName = `Android: ${altMatch[1].trim()}`;
        } else {
          deviceName = 'Android Device';
        }
      }
    } else if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      platformName = 'iOS/iPadOS';
      if (/iPad/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        deviceName = 'iPad';
      } else {
        deviceName = 'iPhone';
      }
    } else if (/Windows/i.test(ua)) {
      platformName = 'Windows';
      if (/Windows NT 10.0/i.test(ua)) deviceName = 'Windows 10/11 PC';
      else if (/Windows NT 6.3/i.test(ua)) deviceName = 'Windows 8.1 PC';
      else if (/Windows NT 6.2/i.test(ua)) deviceName = 'Windows 8 PC';
      else if (/Windows NT 6.1/i.test(ua)) deviceName = 'Windows 7 PC';
      else deviceName = 'Windows PC';
    } else if (/Macintosh/i.test(ua)) {
      platformName = 'macOS';
      deviceName = 'MacBook/iMac';
    } else if (/Linux/i.test(ua)) {
      platformName = 'Linux';
      deviceName = 'Linux PC';
    }

    // Modern browsers support User-Agent Client Hints which are much more accurate
    const uaData = (navigator as any).userAgentData;
    if (uaData && uaData.getHighEntropyValues) {
      try {
        const hints = await uaData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
        if (hints.model) {
          // If we got a real model name, use it
          const pName = hints.platform || platformName;
          deviceName = `${pName}: ${hints.model}`;
          if (hints.platform) platformName = hints.platform;
        }
      } catch (e) {
        // Silently fail and keep the UA-based name
      }
    }

    try {
      const q = query(
        collection(db, 'device_sessions'), 
        where('deviceId', '==', deviceId),
        where('userId', '==', userData.id)
      );
      const snapshot = await getDocs(q);
      
      // Check if this device is already registered and revoked
      if (!snapshot.empty) {
        const existingData = snapshot.docs[0].data();
        if (existingData.revoked) {
          throw new Error('REVOKED');
        }
      }
      
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
      if (error instanceof Error && error.message === 'REVOKED') {
        throw error; // Re-throw to be handled in login
      }
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
        
        try {
          const unsub = await registerDevice(userData);
          setUser(userData);
          sessionStorage.setItem('dalia_user', JSON.stringify(userData));
          unsubRef.current = unsub;
          await logActivity(userData, 'Login', 'Pengguna berhasil masuk ke aplikasi', 'success');
          console.log('Login successful.');
          return true;
        } catch (error) {
          if (error instanceof Error && error.message === 'REVOKED') {
            console.log('Login blocked: device is revoked.');
            return 'REVOKED' as any; // Special return value
          }
          throw error;
        }
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
