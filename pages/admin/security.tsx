import React from 'react';
import Head from 'next/head';
import SecurityDashboard from '@components/security/SecurityDashboard';

export default function AdminSecurityPage() {
  return (
    <>
      <Head>
        <title>Security Dashboard | Admin</title>
        <meta name="robots" key="robots" content="noindex, nofollow" />
        <meta name="description" content="API Security Dashboard for monitoring rate limit violations, CORS errors, and threat events." />
      </Head>
      <main className="min-h-screen bg-gray-100 dark:bg-gray-950 py-8 px-4">
        <SecurityDashboard />
      </main>
    </>
  );
}
