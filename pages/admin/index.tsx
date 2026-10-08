import AdminDashboard from '../../components/AdminDashboard';
import AdminProtectedRoute from '../../components/AdminProtectedRoute';
import Head from 'next/head';

export default function AdminPage() {
  return (
    <>
      {/* Head sits outside the client-side gate so noindex is in the SSR HTML. */}
      <Head>
        <title>Admin Dashboard | Spokane Storefront</title>
        <meta name="robots" key="robots" content="noindex, nofollow" />
      </Head>
      <AdminProtectedRoute requiredRole="technician">
        <main className="bg-neutral-50 min-h-screen">
          <AdminDashboard />
        </main>
      </AdminProtectedRoute>
    </>
  );
}
