import React from 'react'
import Link from 'next/link'
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next'
import { DynamicSEO } from '@components/common/DynamicSEO'
import { Breadcrumbs } from '@components/common/Breadcrumbs'
import { getLayoutProps } from '@lib/get-layout-props'
import { getBaseUrl } from '@lib/seo'
import { sanitizeRichText } from '@lib/sanitize-html'
import { BUSINESS_INFO } from '@lib/business-info'
import { POLICY_ROUTES, fetchShopPolicy, isPolicyHandle, type PolicyHandle } from '@lib/shopify-policies'

interface PolicyPageProps {
  handle: PolicyHandle
  title: string
  /** Policy HTML from Shopify (sanitized at render), or null when the policy is empty. */
  bodyHtml: string | null
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (Object.keys(POLICY_ROUTES) as PolicyHandle[]).map((handle) => ({ params: { handle } })),
  fallback: false,
})

export const getStaticProps: GetStaticProps<PolicyPageProps> = async ({ params }) => {
  const handle = params?.handle
  if (!isPolicyHandle(handle)) return { notFound: true }

  const [layoutProps, policy] = await Promise.all([getLayoutProps(), fetchShopPolicy(handle)])

  return {
    props: {
      ...layoutProps,
      handle,
      title: policy?.title || POLICY_ROUTES[handle].title,
      bodyHtml: policy ? policy.body : null,
    },
    // Policies are edited in Shopify admin; pick up changes within the hour.
    revalidate: 3600,
  }
}

export default function PolicyPage({ handle, title, bodyHtml }: InferGetStaticPropsType<typeof getStaticProps>) {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: title, isCurrent: true },
  ]
  const description = `${title} for ${BUSINESS_INFO.name} (DisplayCellPros), Spokane, WA.`

  return (
    <>
      <DynamicSEO
        title={`${title} | DisplayCellPros`}
        description={description}
        canonical={`${getBaseUrl()}/policies/${handle}`}
        breadcrumbs={breadcrumbItems}
        // Don't index the placeholder page shown while a policy is still empty in Shopify.
        noindex={!bodyHtml}
      />

      <div className="min-h-screen bg-canvas py-4 sm:py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs id="policy-page-breadcrumbs" items={breadcrumbItems} />

          <article id={`policy-${handle}`} className="mt-6 mb-16">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 mb-6">{title}</h1>

            {bodyHtml ? (
              <div
                className="policy-body text-sm sm:text-base leading-relaxed text-neutral-700 space-y-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h2]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_h3]:mt-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_a]:underline [&_a]:text-neutral-900 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(bodyHtml) }}
              />
            ) : (
              <div className="rounded-2xl border border-border-subtle bg-white p-6 text-sm sm:text-base text-neutral-700 space-y-3">
                <p>Our {title.toLowerCase()} is being updated and will be posted here shortly.</p>
                <p>
                  In the meantime, if you have any questions please call us at{' '}
                  <a className="font-semibold text-neutral-900 underline" href={BUSINESS_INFO.phoneHref}>
                    {BUSINESS_INFO.phoneDisplay}
                  </a>{' '}
                  or email{' '}
                  <a className="font-semibold text-neutral-900 underline" href={`mailto:${BUSINESS_INFO.email}`}>
                    {BUSINESS_INFO.email}
                  </a>
                  .
                </p>
                <p>
                  <Link href="/" className="font-semibold text-neutral-900 underline">
                    Return to the homepage
                  </Link>
                </p>
              </div>
            )}
          </article>
        </div>
      </div>
    </>
  )
}
