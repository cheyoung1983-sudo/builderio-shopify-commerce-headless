'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../lib/firebase';

export type UserRole = 'owner' | 'admin' | 'technician' | null;

interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Enforce verified email
        if (!currentUser.emailVerified) {
          console.warn("User email not verified.");
          setRole(null);
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Listen for real-time role changes
        const unsubRole = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setRole(docSnap.data().role as UserRole);
          } else {
            // First time registration logic
            // Check if this is the bootstrapped owner email
            const isOwnerEmail = currentUser.email === 'cheyoung1983@gmail.com';
            const initialRole: UserRole = isOwnerEmail ? 'owner' : 'technician';
            
            try {
              await setDoc(userDocRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                role: initialRole,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              
              // If owner, also add to the efficiency admin list
              if (initialRole === 'owner') {
                await setDoc(doc(db, 'admins', currentUser.uid), { uid: currentUser.uid });
              }
              
              setRole(initialRole);
            } catch (err) {
              console.error("Failed to register user profile:", err);
            }
          }
          setLoading(false);
        }, (err) => {
          console.error("Role listener error:", err);
          setLoading(false);
        });

        return () => unsubRole();
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    await signInWithGoogle();
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
