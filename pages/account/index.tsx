import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import {
  CUSTOMER_QUERY,
  customerAccountFetch,
  refreshAccessToken,
  CustomerAccountProfile,
} from '../../services/shopify-customer-account'
import { appendCookie, COOKIE, isHttpsRequest } from '../../lib/shopify/customer-account/cookies'
import { OrderHistory } from '../../components/account'
import { User, MapPin, Mail, LogOut, Package, ShieldCheck, Truck } from 'lucide-react'

interface AccountPageProps {
  customer: CustomerAccountProfile | null
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
    const { data } = await customerAccountFetch<{ customer: CustomerAccountProfile }>({
      accessToken,
      query: CUSTOMER_QUERY,
    })
    return { props: { customer: data?.customer ?? null, loginError } }
  } catch {
    return { props: { customer: null, loginError } }
  }
}

export default function AccountPage({ customer, loginError }: AccountPageProps) {
  const customerOrders = (customer?.orders?.edges || []).map((edge) => edge.node)
  const customerEmail = customer?.emailAddress?.emailAddress || ''

  return (
    <>
      <Head>
        <title>Customer Account & Order History | DisplayCellPros</title>
        <meta
          name="description"
          content="View your verified DisplayCellPros purchase history, order statuses, and live courier tracking."
        />
      </Head>

      <main className="min-h-screen bg-neutral-50/60 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {loginError && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 max-w-md mx-auto">
              Sign-in failed: {loginError}
            </div>
          )}

          {customer ? (
            <div className="space-y-8">
              {/* Account Dashboard Top Banner */}
              <div className="bg-white border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Customer Identity */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                      {customer.firstName ? customer.firstName[0].toUpperCase() : 'C'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                          {customer.firstName || customer.lastName
                            ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                            : 'Valued Customer'}
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Verified Buyer</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-neutral-600">
                        {customerEmail && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{customerEmail}</span>
                          </span>
                        )}
                        {customer.defaultAddress && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                            <span>
                              {[
                                customer.defaultAddress.city,
                                customer.defaultAddress.province,
                                customer.defaultAddress.country,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/order-tracking"
                      className="px-4 py-2.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Lookup by Order ID</span>
                    </Link>

                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation to an API route redirect */}
                    <a
                      href="/api/account/logout"
                      className="px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-red-700 bg-white hover:bg-red-50 border border-neutral-200 hover:border-red-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Secure Order History Section */}
              <OrderHistory
                orders={customerOrders}
                customerEmail={customerEmail}
              />
            </div>
          ) : (
            /* Unauthenticated View */
            <div className="mx-auto max-w-md rounded-2xl bg-white p-8 sm:p-10 shadow-xs border border-border-subtle text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-800 flex items-center justify-center mx-auto mb-4">
                <User className="w-7 h-7" />
              </div>

              <h1 className="text-xl font-bold text-neutral-900 tracking-tight mb-2">
                Customer Account Login
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-6">
                Sign in with your Shopify Customer Account to view your secure purchase history, order invoices, and shipment tracking.
              </p>

              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation to an API route redirect */}
              <a
                href="/api/account/login?returnTo=/account"
                className="w-full py-3 px-6 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <span>Sign in with Shopify</span>
              </a>

              <div className="mt-8 pt-6 border-t border-neutral-200">
                <p className="text-xs text-neutral-600 mb-2">
                  Need to track a recent delivery without logging in?
                </p>
                <Link
                  href="/order-tracking"
                  className="text-xs font-semibold text-neutral-900 underline hover:text-neutral-700 inline-flex items-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Track Order by ID & Email →</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

