'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext, startTransition } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

// SHA-256 of the bootstrap owner email, so the address itself is not shipped in client JS.
const OWNER_EMAIL_SHA256 = '91ef4fe7f9915011a9da6a85eaa36ecab08acd349363d0f6c5198b855a5c6586';

async function isBootstrapOwnerEmail(email: string | null): Promise<boolean> {
  if (!email || typeof crypto === 'undefined' || !crypto.subtle) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return hex === OWNER_EMAIL_SHA256;
}

export type UserRole = 'owner' | 'admin' | 'technician' | null;

interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Routes that always need Firebase Auth at load (staff/admin/account areas). */
const AUTH_ROUTE_PREFIXES = ['/account', '/admin', '/dashboard', '/staff', '/technician'];

/**
 * Firebase (app + auth + firestore) is ~190 KB of JS plus a ~90 KB auth iframe.
 * Most shoppers never sign in, so it is loaded only when needed:
 *  - on auth routes,
 *  - when this browser already has a persisted Firebase session, or
 *  - when login() is called.
 */
async function hasPersistedFirebaseSession(): Promise<boolean> {
  try {
    const idb = (globalThis as any).indexedDB;
    if (idb && typeof idb.databases === 'function') {
      const dbs: Array<{ name?: string }> = await idb.databases();
      return dbs.some((d) => d.name === 'firebaseLocalStorageDb');
    }
    // Browsers without indexedDB.databases(): load to be safe.
    return true;
  } catch {
    return true;
  }
}

function loadFirebase() {
  return Promise.all([
    import('../lib/firebase'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const started = useRef<Promise<void> | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    if (started.current) return started.current;
    started.current = loadFirebase().then(([fb, authMod, fs]) => {
      const { auth, db } = fb;
      const { onAuthStateChanged } = authMod;
      const { doc, onSnapshot, setDoc, serverTimestamp } = fs;
      let unsubRole: (() => void) | null = null;

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        unsubRole?.();
        unsubRole = null;
        startTransition(() => {
          setUser(currentUser);
        });

        if (currentUser) {
          // Enforce verified email
          if (!currentUser.emailVerified) {
            console.warn("User email not verified.");
            startTransition(() => {
              setRole(null);
              setLoading(false);
            });
            return;
          }

          const userDocRef = doc(db, 'users', currentUser.uid);

          // Listen for real-time role changes
          unsubRole = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              startTransition(() => {
                setRole(docSnap.data().role as UserRole);
                setLoading(false);
              });
            } else {
              // First time registration logic
              // Check if this is the bootstrapped owner email
              const isOwnerEmail = await isBootstrapOwnerEmail(currentUser.email);
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

                startTransition(() => {
                  setRole(initialRole);
                });
              } catch (err) {
                console.error("Failed to register user profile:", err);
              } finally {
                startTransition(() => {
                  setLoading(false);
                });
              }
            }
          }, (err) => {
            console.error("Role listener error:", err);
            startTransition(() => {
              setLoading(false);
            });
          });
        } else {
          startTransition(() => {
            setRole(null);
            setLoading(false);
          });
        }
      });

      cleanup.current = () => {
        unsubRole?.();
        unsubscribe();
      };
    }).catch((err) => {
      console.error("[Auth] Failed to load Firebase:", err);
      started.current = null;
      startTransition(() => setLoading(false));
    });
    return started.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const onAuthRoute = AUTH_ROUTE_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
    (onAuthRoute ? Promise.resolve(true) : hasPersistedFirebaseSession()).then((needed) => {
      if (cancelled) return;
      if (needed) {
        start();
      } else {
        // No session in this browser: signed out, nothing to load yet.
        startTransition(() => setLoading(false));
      }
    });
    return () => {
      cancelled = true;
      cleanup.current?.();
    };
  }, [start]);

  const login = async () => {
    await start();
    const { signInWithGoogle } = await import('../lib/firebase');
    await signInWithGoogle();
  };

  const logout = async () => {
    if (!started.current) return;
    await started.current;
    const [{ auth }, { signOut }] = await Promise.all([import('../lib/firebase'), import('firebase/auth')]);
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
