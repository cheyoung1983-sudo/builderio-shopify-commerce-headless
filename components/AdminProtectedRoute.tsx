'use client';

import { useAuth } from '../hooks/useAuth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'technician';
}

export default function AdminProtectedRoute({ children, requiredRole = 'technician' }: ProtectedRouteProps) {
  const { user, role, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-neutral-600 font-medium animate-pulse">Verifying credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 text-white p-6">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Restricted Access</h1>
        <p className="text-neutral-400 text-center max-w-sm mb-8 leading-relaxed">
          The Developer Control Center is restricted to authorized personnel only. 
          Please sign in with your Spokane corporate account.
        </p>
        <button
          onClick={login}
          className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-all active:scale-95 shadow-lg shadow-white/5"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  // Check role hierarchy
  // owner > admin > technician
  const roles = ['technician', 'admin', 'owner'];
  const userRoleIndex = roles.indexOf(role || '');
  const requiredRoleIndex = roles.indexOf(requiredRole);

  if (userRoleIndex < requiredRoleIndex) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Insufficient Permissions</h2>
        <p className="text-neutral-500 max-w-md mb-8">
          Your account ({user.email}) is registered as <strong>{role}</strong>. 
          This section requires <strong>{requiredRole}</strong> level access.
        </p>
        <a 
          href="/"
          className="text-emerald-700 font-semibold hover:underline"
        >
          Return to Storefront
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
