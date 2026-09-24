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
import { ArrowLeft, User, ShieldCheck } from 'lucide-react'

interface AccountOrdersPageProps {
  customer: CustomerAccountProfile | null
}

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30

export const getServerSideProps: GetServerSideProps<AccountOrdersPageProps> = async (ctx) => {
  const { req, res } = ctx

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
    return {
      redirect: {
        destination: '/api/account/login?returnTo=/account/orders',
        permanent: false,
      },
    }
  }

  try {
    const { data } = await customerAccountFetch<{ customer: CustomerAccountProfile }>({
      accessToken,
      query: CUSTOMER_QUERY,
    })

    if (!data?.customer) {
      return {
        redirect: {
          destination: '/api/account/login?returnTo=/account/orders',
          permanent: false,
        },
      }
    }

    return { props: { customer: data.customer } }
  } catch {
    return {
      redirect: {
        destination: '/api/account/login?returnTo=/account/orders',
        permanent: false,
      },
    }
  }
}

export default function AccountOrdersPage({ customer }: AccountOrdersPageProps) {
  const customerOrders = (customer?.orders?.edges || []).map((edge) => edge.node)
  const customerEmail = customer?.emailAddress?.emailAddress || ''

  return (
    <>
      <Head>
        <title>My Orders & Purchase History | DisplayCellPros</title>
        <meta
          name="description"
          content="View past hardware and screen replacement purchases with verified delivery tracking."
        />
      </Head>

      <main className="min-h-screen bg-neutral-50/60 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Account Overview</span>
            </Link>

            <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authenticated Session ({customerEmail || 'Customer'})</span>
            </span>
          </div>

          {/* Secure Order History Component */}
          <OrderHistory
            orders={customerOrders}
            customerEmail={customerEmail}
          />
        </div>
      </main>
    </>
  )
}
