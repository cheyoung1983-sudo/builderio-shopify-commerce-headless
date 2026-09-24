import AdminDashboard from '../../components/AdminDashboard';
import AdminProtectedRoute from '../../components/AdminProtectedRoute';
import Head from 'next/head';

export default function AdminPage() {
  return (
    <AdminProtectedRoute requiredRole="technician">
      <Head>
        <title>Admin Dashboard | Spokane Storefront</title>
      </Head>
      <main className="bg-neutral-50 min-h-screen">
        <AdminDashboard />
      </main>
    </AdminProtectedRoute>
  );
}
