import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import {
  CUSTOMER_QUERY,
  customerAccountFetch,
  refreshAccessToken,
} from '../../services/shopify-customer-account'
import { appendCookie, COOKIE, isHttpsRequest } from '../../lib/shopify/customer-account/cookies'

interface CustomerAddress {
  address1?: string | null
  address2?: string | null
  city?: string | null
  province?: string | null
  zip?: string | null
  country?: string | null
}

interface Customer {
  id: string
  firstName?: string | null
  lastName?: string | null
  emailAddress?: { emailAddress?: string | null } | null
  defaultAddress?: CustomerAddress | null
}

interface AccountPageProps {
  customer: Customer | null
  loginError: string | null
}

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30

export const getServerSideProps: GetServerSideProps<AccountPageProps> = async (ctx) => {
  const { req, res, query } = ctx
  const loginError = typeof query.error === 'string' ? query.error : null

  let accessToken = req.cookies[COOKIE.accessToken]
  const expiresAt = Number(req.cookies[COOKIE.expiresAt] || 0)
  const refreshToken = req.cookies[COOKIE.refreshToken]

  const isExpired = !accessToken || !expiresAt || Date.now() >= expiresAt

  if (isExpired && refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken)
      accessToken = tokens.accessToken
      const secure = isHttpsRequest(req)
      const expiresInSeconds = Math.max(1, Math.floor((tokens.expiresAt - Date.now()) / 1000))
      appendCookie(res, COOKIE.accessToken, tokens.accessToken, { maxAge: expiresInSeconds, secure })
      appendCookie(res, COOKIE.idToken, tokens.idToken, { maxAge: expiresInSeconds, secure })
      appendCookie(res, COOKIE.expiresAt, String(tokens.expiresAt), { maxAge: expiresInSeconds, secure })
      if (tokens.refreshToken) {
        appendCookie(res, COOKIE.refreshToken, tokens.refreshToken, { maxAge: REFRESH_TOKEN_MAX_AGE, secure })
      }
    } catch {
      accessToken = undefined
    }
  } else if (isExpired) {
    accessToken = undefined
  }

  if (!accessToken) {
    return { props: { customer: null, loginError } }
  }

  try {
    const { data } = await customerAccountFetch<{ customer: Customer }>({
      accessToken,
      query: CUSTOMER_QUERY,
    })
    return { props: { customer: data?.customer ?? null, loginError } }
  } catch {
    return { props: { customer: null, loginError } }
  }
}

export default function AccountPage({ customer, loginError }: AccountPageProps) {
  return (
    <>
      <Head>
        <title>My Account | DisplayCellPros Storefront</title>
      </Head>
      <main className="min-h-screen bg-neutral-50/50 py-12 px-4">
        <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-sm">
          {loginError && (
            <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
              Sign-in failed: {loginError}
            </p>
          )}

          {customer ? (
            <>
              <h1 className="text-xl font-semibold">
                Welcome{customer.firstName ? `, ${customer.firstName}` : ''}
              </h1>
              <dl className="mt-4 space-y-2 text-sm text-neutral-700">
                {customer.emailAddress?.emailAddress && (
                  <div>
                    <dt className="font-medium">Email</dt>
                    <dd>{customer.emailAddress.emailAddress}</dd>
                  </div>
                )}
                {customer.defaultAddress && (
                  <div>
                    <dt className="font-medium">Default address</dt>
                    <dd>
                      {[
                        customer.defaultAddress.address1,
                        customer.defaultAddress.city,
                        customer.defaultAddress.province,
                        customer.defaultAddress.zip,
                        customer.defaultAddress.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation to an API route redirect, not a Next page */}
              <a
                href="/api/account/logout"
                className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              >
                Sign out
              </a>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Sign in to your account</h1>
              <p className="mt-2 text-sm text-neutral-600">
                View your orders, addresses, and profile.
              </p>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation to an API route redirect, not a Next page */}
              <a
                href="/api/account/login?returnTo=/account"
                className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              >
                Sign in
              </a>
            </>
          )}
        </div>
      </main>
    </>
  )
}
