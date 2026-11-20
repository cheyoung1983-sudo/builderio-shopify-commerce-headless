'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext, startTransition } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

// SHA-256 hashes of the two authorized owner emails so addresses are not exposed in client JS.
const OWNER_EMAIL_SHA256_ALLOWLIST = new Set([
  '91ef4fe7f9915011a9da6a85eaa36ecab08acd349363d0f6c5198b855a5c6586', // personal owner
  'f48875e828a1a32f5c9e9ab24b6d738f42aff9e52620ca728a76b7a5eafdeacb', // business owner
]);

export async function isBootstrapOwnerEmail(email: string | null | undefined): Promise<boolean> {
  if (!email || typeof crypto === 'undefined' || !crypto.subtle) return false;
  const normalized = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return OWNER_EMAIL_SHA256_ALLOWLIST.has(hex);
}

export type UserRole = 'owner' | 'User' | null;

interface AuthContextType {
  user: FirebaseUser | null;
  role: UserRole;
  isVerifiedOwner: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Routes that always need Firebase Auth at load (owner/admin/wholesale/account areas). */
const AUTH_ROUTE_PREFIXES = ['/account', '/admin', '/wholesale', '/compliance', '/dashboard', '/staff'];

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
  const [isVerifiedOwner, setIsVerifiedOwner] = useState<boolean>(false);
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
          // Strictly enforce verified email
          if (!currentUser.emailVerified) {
            console.warn('[Auth] User email not verified.');
            startTransition(() => {
              setRole(null);
              setIsVerifiedOwner(false);
              setLoading(false);
            });
            return;
          }

          const ownerMatch = await isBootstrapOwnerEmail(currentUser.email);
          const userDocRef = doc(db, 'users', currentUser.uid);

          // Listen for real-time role changes
          unsubRole = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const storedRole = String(docSnap.data().role || '');
              const effectiveRole: UserRole = ownerMatch && (storedRole === 'owner' || storedRole === 'Admin' || storedRole === 'admin')
                ? 'owner'
                : ownerMatch
                  ? 'owner'
                  : 'User';

              // Ensure allowlisted owner is indexed in /admins/{uid}
              if (ownerMatch && storedRole !== 'owner') {
                try {
                  await setDoc(doc(db, 'admins', currentUser.uid), { uid: currentUser.uid }, { merge: true });
                } catch {
                  // Handled gracefully by rules if unpermitted
                }
              }

              startTransition(() => {
                setRole(effectiveRole);
                setIsVerifiedOwner(ownerMatch);
                setLoading(false);
              });
            } else {
              // First-time registration: strictly 'owner' only if allowlisted, otherwise 'User' (never technician/admin)
              const initialRole: UserRole = ownerMatch ? 'owner' : 'User';

              try {
                await setDoc(userDocRef, {
                  uid: currentUser.uid,
                  email: (currentUser.email || '').trim().toLowerCase(),
                  role: initialRole,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });

                if (ownerMatch) {
                  await setDoc(doc(db, 'admins', currentUser.uid), { uid: currentUser.uid });
                }

                startTransition(() => {
                  setRole(initialRole);
                  setIsVerifiedOwner(ownerMatch);
                });
              } catch (err) {
                console.error('[Auth] Failed to register user profile:', err);
                startTransition(() => {
                  setRole(ownerMatch ? 'owner' : null);
                  setIsVerifiedOwner(ownerMatch);
                });
              } finally {
                startTransition(() => {
                  setLoading(false);
                });
              }
            }
          }, (err) => {
            console.error('[Auth] Role listener error:', err);
            startTransition(() => {
              setRole(ownerMatch ? 'owner' : null);
              setIsVerifiedOwner(ownerMatch);
              setLoading(false);
            });
          });
        } else {
          startTransition(() => {
            setRole(null);
            setIsVerifiedOwner(false);
            setLoading(false);
          });
        }
      });

      cleanup.current = () => {
        unsubRole?.();
        unsubscribe();
      };
    }).catch((err) => {
      console.error('[Auth] Failed to load Firebase:', err);
      started.current = null;
      startTransition(() => {
        setIsVerifiedOwner(false);
        setLoading(false);
      });
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

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, role, isVerifiedOwner, loading, login, logout, getIdToken }}>
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
