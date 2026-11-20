'use client';

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
import { isAdminEmail } from '../lib/tribal/owner-allowlist';
import { Loader2, ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin';
  featureName?: string;
}

export default function AdminProtectedRoute({
  children,
  featureName = 'Owner Control Center',
}: ProtectedRouteProps) {
  const {
    user: fbUser,
    isVerifiedOwner: fbVerifiedOwner,
    loading: fbLoading,
    login: fbLogin,
    logout: fbLogout,
  } = useAuth();
  const {
    user: auth0User,
    isVerifiedOwner: auth0VerifiedOwner,
    isLoading: auth0Loading,
    login: auth0Login,
    logout: auth0Logout,
  } = useUserRole();

  // Wait until at least one provider resolves or both finish loading
  if (fbLoading && auth0Loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-neutral-600 font-medium animate-pulse">
          Verifying owner identity across security providers...
        </p>
      </div>
    );
  }

  // Strictly enforce verified two-email allowlist (cheyoung1983@gmail.com | ryan@displaycellpros.com)
  const fbAuthorized = Boolean(
    fbUser && fbUser.emailVerified === true && fbVerifiedOwner && isAdminEmail(fbUser.email)
  );
  const auth0Authorized = Boolean(
    auth0User &&
      auth0User.email_verified === true &&
      auth0VerifiedOwner &&
      isAdminEmail(auth0User.email)
  );

  const isAuthorizedOwner = fbAuthorized || auth0Authorized;

  const signedInUser = fbUser
    ? {
        email: fbUser.email || 'Unknown',
        emailVerified: fbUser.emailVerified === true,
        provider: 'Google',
        logout: fbLogout,
      }
    : auth0User
      ? {
          email: auth0User.email || 'Unknown',
          emailVerified: auth0User.email_verified === true,
          provider: 'Auth0',
          logout: auth0Logout,
        }
      : null;

  if (!signedInUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 text-white p-6">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/20">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Restricted Owner Access</h1>
        <p className="text-neutral-400 text-center max-w-md mb-8 leading-relaxed">
          {featureName} is locked exclusively to verified owner accounts. Please sign in with your authorized personal or business account.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            onClick={fbLogin}
            className="w-full sm:w-auto px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-all active:scale-95 shadow-lg shadow-white/5 cursor-pointer"
          >
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={auth0Login}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            Sign in with Auth0 SSO
          </button>
        </div>
        <div className="mt-8">
          <Link
            href="/"
            className="text-xs text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthorizedOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6 border border-rose-200">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h2>
        <p className="text-neutral-600 max-w-md mb-6 text-sm leading-relaxed">
          Your account (<span className="font-mono font-semibold text-neutral-900">{signedInUser.email}</span> via{' '}
          {signedInUser.provider}
          {!signedInUser.emailVerified ? ', unverified email' : ''}) is not on the authorized owner allowlist for{' '}
          <strong>{featureName}</strong>.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => void signedInUser.logout()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-800 text-sm font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch Account</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
