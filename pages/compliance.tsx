import React from 'react'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import Head from 'next/head'
import { DynamicSEO } from '../components/common/DynamicSEO'
import { Breadcrumbs } from '../components/common/Breadcrumbs'
import dynamic from 'next/dynamic'

const DigitalIdentityComplianceCenter = dynamic(() => import('../components/compliance/DigitalIdentityComplianceCenter').then(mod => mod.DigitalIdentityComplianceCenter))
const SelfieChecksInspector = dynamic(() => import('../components/persona/SelfieChecksInspector').then(mod => mod.SelfieChecksInspector))
const InquiryLifecyclePanel = dynamic(() => import('../components/persona/InquiryLifecyclePanel').then(mod => mod.InquiryLifecyclePanel))
const WorkflowConfigurationPanel = dynamic(() => import('../components/persona/WorkflowConfigurationPanel').then(mod => mod.WorkflowConfigurationPanel))
const TransactionTypeRegistry = dynamic(() => import('../components/persona/TransactionTypeRegistry').then(mod => mod.TransactionTypeRegistry))
const ConnectionsVisualizer = dynamic(() => import('../components/persona/ConnectionsVisualizer').then(mod => mod.ConnectionsVisualizer))
const ComplianceAuditLog = dynamic(() => import('../components/persona/ComplianceAuditLog').then(mod => mod.ComplianceAuditLog))
import { AdminGuard } from '../components/auth/AdminGuard'
import { getLayoutProps } from '../lib/get-layout-props'

export async function getStaticProps(context: GetStaticPropsContext) {
  let layoutProps = { theme: null }
  try {
    layoutProps = await getLayoutProps()
  } catch (err) {
    console.error('[pages/compliance] Error fetching layout props:', err)
  }

  return {
    props: {
      ...layoutProps,
    },
    revalidate: 3600,
  }
}

export default function CompliancePage(_props: InferGetStaticPropsType<typeof getStaticProps>) {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Digital Identity & Compliance', isCurrent: true },
  ]

  return (
    <>
      <Head>
        <meta name="robots" key="robots" content="noindex, nofollow" />
      </Head>
      <DynamicSEO
        title="Digital Identity & Compliance Center | DisplayCellPros"
        description="Explore our digital identity verification standards, KYC proofing protocols, GDPR & CCPA privacy rights, and cryptographic data minimization."
        breadcrumbs={breadcrumbItems}
      />

      <main className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Breadcrumbs
            id="compliance-breadcrumbs"
            items={breadcrumbItems}
            variant="contained"
            showHomeIcon={true}
            showBackOnMobile={true}
          />

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Digital Identity & Compliance Center
            </h1>
            <p className="text-sm text-neutral-600 max-w-2xl">
              DisplayCellPros is committed to the highest standards of data security, privacy by design, and regulatory compliance across all commercial transactions and tribal member verifications.
            </p>
          </div>

          <AdminGuard requiredRole="Admin" featureName="Digital Identity & Compliance Center">
            <DigitalIdentityComplianceCenter />
            <InquiryLifecyclePanel />
            <SelfieChecksInspector />
            <WorkflowConfigurationPanel />
            <TransactionTypeRegistry />
            <ConnectionsVisualizer />
            <ComplianceAuditLog />
          </AdminGuard>
        </div>
      </main>
    </>
  )
}
