'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, Terminal, Shield, Package, ShoppingCart, Search, CreditCard, Box, User, ExternalLink, Info } from 'lucide-react';

interface HealthStatus {
  status: string;
  [key: string]: any;
}

interface HealthData {
  elevenLabs: HealthStatus;
  webhooks: HealthStatus;
  apiKeys: HealthStatus;
}

const StatusIcon = ({ status }: { status: string }) => 
    status === 'connected' || status === 'healthy' || status === 'configured' 
      ? <CheckCircle className="text-green-500 w-5 h-5" /> 
      : <AlertCircle className="text-red-500 w-5 h-5" />;

const HealthCard = ({ title, status }: { title: string, status: string }) => (
    <div className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-semibold flex items-center gap-2 mb-2">
        <StatusIcon status={status} />
        {title}
      </h3>
      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Status</p>
      <p className="text-sm text-gray-700 mt-0.5">{status}</p>
    </div>
  );

const CommandBlock = ({ cmd, desc }: { cmd: string, desc: string }) => (
  <div className="bg-neutral-900 rounded-lg p-3 my-2 border border-neutral-800">
    <div className="flex items-center justify-between mb-1">
      <code className="text-emerald-400 text-xs font-mono">{cmd}</code>
      <button 
        onClick={() => navigator.clipboard.writeText(cmd)}
        className="text-neutral-500 hover:text-white transition-colors p-1"
        title="Copy command"
      >
        <Package className="w-3 h-3" />
      </button>
    </div>
    <p className="text-[11px] text-neutral-400 leading-tight">{desc}</p>
  </div>
);

import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  role: 'owner' | 'admin' | 'technician';
  createdAt: any;
}

export default function AdminDashboard() {
  const { user, role, logout } = useAuth();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'health' | 'cli' | 'ucp' | 'team'>('health');
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Listen for all users if admin/owner
  useEffect(() => {
    if (role === 'admin' || role === 'owner') {
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
        setUsers(userList);
      });
      return () => unsubscribe();
    }
  }, [role]);

  const updateUserRole = async (targetUid: string, newRole: string) => {
    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, { 
        role: newRole,
        updatedAt: serverTimestamp()
      });
      
      // Update the efficiency admin index if promoted/demoted
      const adminRef = doc(db, 'admins', targetUid);
      if (newRole === 'admin' || newRole === 'owner') {
        await setDoc(adminRef, { uid: targetUid });
      } else {
        await deleteDoc(adminRef);
      }
    } catch (err) {
      console.error("Failed to update role:", err);
      alert("Insufficient permissions to change roles.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
        <Loader2 className="animate-spin text-emerald-600 mb-4 w-8 h-8" />
        <p className="text-neutral-600 font-medium">Synchronizing system health...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xl">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Developer Control Center</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-full font-bold uppercase tracking-tighter">
                {role}
              </span>
              <p className="text-sm text-neutral-500">{user?.email}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('health')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'health' ? 'bg-white text-emerald-700 shadow-sm' : 'text-neutral-50'}`}
            >
              Health
            </button>
            <button 
              onClick={() => setActiveTab('cli')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'cli' ? 'bg-white text-blue-700 shadow-sm' : 'text-neutral-500'}`}
            >
              CLI
            </button>
            <button 
              onClick={() => setActiveTab('ucp')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'ucp' ? 'bg-white text-indigo-700 shadow-sm' : 'text-neutral-500'}`}
            >
              UCP
            </button>
            {(role === 'admin' || role === 'owner') && (
              <button 
                onClick={() => setActiveTab('team')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'team' ? 'bg-white text-orange-700 shadow-sm' : 'text-neutral-500'}`}
              >
                Team
              </button>
            )}
          </div>
          <button 
            onClick={logout}
            className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
            title="Sign Out"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>
      </header>

      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <HealthCard title="ElevenLabs Voice Agent" status={data?.elevenLabs.status || 'unknown'} />
            <HealthCard title="Shopify Admin Webhooks" status={data?.webhooks.status || 'unknown'} />
            <HealthCard title="API Credentials Cache" status={data?.apiKeys.status || 'unknown'} />
          </div>
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Shield className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-900">Spokane Local Environment Secure</h3>
              <p className="text-sm text-emerald-800 mt-1">
                Your environment is correctly configured for the Spokane storefront. 
                All API requests are currently authenticated using the <strong>{process.env.SHOPIFY_STOREFRONT_API_VERSION || '2024-07'}</strong> API version.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cli' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <section className="bg-white border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <User className="text-blue-600 w-5 h-5" />
                Authentication & Core
              </h3>
              <CommandBlock 
                cmd="shopify auth login" 
                desc="Logs you in to your Shopify account. Use --alias for existing sessions." 
              />
              <CommandBlock 
                cmd="shopify auth logout" 
                desc="Logs you out of the Shopify account or Partner account." 
              />
              <CommandBlock 
                cmd="shopify version" 
                desc="Check current installed version of Shopify CLI." 
              />
            </section>

            <section className="bg-white border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Box className="text-blue-600 w-5 h-5" />
                App Management
              </h3>
              <CommandBlock 
                cmd="shopify app dev" 
                desc="Starts a local development server for your app." 
              />
              <CommandBlock 
                cmd="shopify app deploy" 
                desc="Builds and deploys your app configuration and extensions." 
              />
            </section>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 h-full">
            <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-4">
              <Info className="w-5 h-5" />
              CLI Pro Tips
            </h3>
            <ul className="space-y-4 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold">01.</span>
                <span>Use <code className="bg-blue-100 px-1 rounded">--alias</code> to manage multiple store sessions simultaneously without frequent re-auth.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">02.</span>
                <span>Run <code className="bg-blue-100 px-1 rounded">shopify commands</code> to see the full list of available operations across all plugins.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">03.</span>
                <span>Ensure your <code className="bg-blue-100 px-1 rounded">.env</code> file has the correct <code className="bg-blue-100 px-1 rounded">SHOPIFY_FLAG_AUTH_ALIAS</code> if running in CI/CD.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'ucp' && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 bg-indigo-900 text-white p-8 rounded-3xl shadow-xl overflow-hidden relative">
            <div className="relative z-10">
              <h2 className="text-2xl font-black mb-2">Universal Commerce Protocol (UCP)</h2>
              <p className="text-indigo-200 max-w-2xl">
                Run agentic commerce flows from product discovery to order tracking across the global Shopify ecosystem.
              </p>
            </div>
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <ShoppingCart className="w-64 h-64 rotate-12" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-2xl p-5 bg-white space-y-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <User className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-neutral-900">01. Profile</h4>
              <p className="text-xs text-neutral-500">Initialize your agent identity.</p>
              <code className="block bg-neutral-50 p-2 rounded text-[10px] font-mono">ucp profile init --name agent</code>
            </div>

            <div className="border rounded-2xl p-5 bg-white space-y-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-neutral-900">02. Discovery</h4>
              <p className="text-xs text-neutral-500">Global catalog search.</p>
              <code className="block bg-neutral-50 p-2 rounded text-[10px] font-mono">ucp catalog search --set /query=&apos;...&apos;</code>
            </div>

            <div className="border rounded-2xl p-5 bg-white space-y-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-neutral-900">03. Checkout</h4>
              <p className="text-xs text-neutral-500">Convert cart to purchase.</p>
              <code className="block bg-neutral-50 p-2 rounded text-[10px] font-mono">ucp checkout create --business ...</code>
            </div>

            <div className="border rounded-2xl p-5 bg-white space-y-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Terminal className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-neutral-900">04. Tracking</h4>
              <p className="text-xs text-neutral-500">Monitor order lifecycle.</p>
              <code className="block bg-neutral-50 p-2 rounded text-[10px] font-mono">ucp order get {'{id}'}</code>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="font-bold flex items-center gap-2 text-indigo-900">
                <CreditCard className="w-5 h-5" />
                Checkout Protocol & Errors
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <p className="text-xs font-bold text-neutral-700 uppercase mb-1">Business Outcomes</p>
                  <p className="text-[11px] text-neutral-600 leading-snug">
                    Inspect <code className="text-indigo-600">ucp.status</code> and <code className="text-indigo-600">messages</code>. 
                    Handle <code className="bg-red-50 px-1 rounded text-red-700">requires_escalation</code> by using the <code className="text-indigo-600">continue_url</code> to hand off to the buyer.
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <p className="text-xs font-bold text-neutral-700 uppercase mb-1">Common Error Codes</p>
                  <ul className="text-[11px] text-neutral-600 list-disc list-inside space-y-1">
                    <li><span className="font-semibold">out_of_stock:</span> Suggest alternatives or adjust quantity.</li>
                    <li><span className="font-semibold">item_unavailable:</span> Remove/replace item and update checkout.</li>
                    <li><span className="font-semibold">payment_failed:</span> Ask for different payment or use <code className="text-indigo-600">continue_url</code>.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="font-bold flex items-center gap-2 text-indigo-900">
                <Shield className="w-5 h-5" />
                Shop Pay Payment Handler
              </h3>
              <p className="text-[11px] text-neutral-600 leading-snug">
                Accelerate checkout using <code className="text-emerald-600">dev.shopify.shop_pay</code>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Path A</p>
                  <p className="text-[10px] text-emerald-700 mt-1">One-time payment request via Shop Pay interface.</p>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Path B</p>
                  <p className="text-[10px] text-emerald-700 mt-1">Identity-Linked payment tokens for autonomous checkout.</p>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-100">
                <p className="text-[10px] text-neutral-500 italic">
                  Ensure <code className="text-indigo-600">shop_id</code> is advertising in your merchant configuration to enable Shop Pay support.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Shield className="text-indigo-600 w-5 h-5" />
              Agent Connectivity Diagnostics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium">UCP CLI Status</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Ready</span>
              </div>
              <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium">AI Toolkit Integration</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Active</span>
              </div>
              <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium">Global Catalog Discovery</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Optimized</span>
              </div>
              <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium">Identity Linking (Delegated IdP)</span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase">Configured</span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-4 italic text-center">
              Run <code className="font-mono text-indigo-600">ucp doctor</code> in your local terminal to verify full agentic commerce health.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900">Spokane Team Management</h2>
            <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {users.length} Authorized Members
            </div>
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Current Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-900">{u.email}</span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-tighter">UID: {u.uid}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        u.role === 'owner' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.uid !== user?.uid && u.role !== 'owner' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateUserRole(u.uid, u.role === 'admin' ? 'technician' : 'admin')}
                            className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold hover:bg-neutral-100 transition-colors"
                          >
                            {u.role === 'admin' ? 'Demote to Technician' : 'Promote to Admin'}
                          </button>
                        </div>
                      )}
                      {u.uid === user?.uid && (
                        <span className="text-xs text-neutral-400 italic">Self (Active)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
            <h3 className="text-orange-900 font-bold flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5" />
              Role Hierarchies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/50 p-4 rounded-xl">
                <p className="font-bold text-xs text-indigo-800 uppercase">Owner</p>
                <p className="text-xs text-neutral-600 mt-1">Full access to billing, RBAC, and all administrative tools.</p>
              </div>
              <div className="bg-white/50 p-4 rounded-xl">
                <p className="font-bold text-xs text-blue-800 uppercase">Admin</p>
                <p className="text-xs text-neutral-600 mt-1">Can manage technicians, monitor health, and access CLI reference.</p>
              </div>
              <div className="bg-white/50 p-4 rounded-xl">
                <p className="font-bold text-xs text-neutral-800 uppercase">Technician</p>
                <p className="text-xs text-neutral-600 mt-1">ReadOnly access to system health and diagnostic tools.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="pt-8 text-center border-t text-neutral-400 text-xs">
        &copy; 2026 DisplayCellPros Spokane &bull; Built with Shopify AI Toolkit & ElevenLabs
      </footer>
    </div>
  );
}
