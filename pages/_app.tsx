import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Router from 'next/router'
import Layout from '@components/common/Layout'
import ErrorBoundary from '@components/ErrorBoundary'
import { builder } from '@builder.io/react'
import builderConfig from '@config/builder'
import { startLoading, stopLoading, forceStopLoading } from '../lib/progress'
import { useScrollRestoration } from '../lib/scroll-restoration'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}

import '@builder.io/widgets'
import 'nprogress/nprogress.css'
import '../styles/globals.css'
import '../builder-registry'

export default function MyApp({ Component, pageProps }: AppProps) {
  useScrollRestoration()

  useEffect(() => {
    const handleStart = (_url: string, { shallow }: { shallow?: boolean } = {}) => {
      if (!shallow) {
        startLoading()
      }
    }

    const handleComplete = (_url: string, { shallow }: { shallow?: boolean } = {}) => {
      if (!shallow) {
        stopLoading()
      }
    }

    const handleError = () => {
      forceStopLoading()
    }

    Router.events.on('routeChangeStart', handleStart)
    Router.events.on('routeChangeComplete', handleComplete)
    Router.events.on('routeChangeError', handleError)

    return () => {
      Router.events.off('routeChangeStart', handleStart)
      Router.events.off('routeChangeComplete', handleComplete)
      Router.events.off('routeChangeError', handleError)
    }
  }, [])

  return (
    <ErrorBoundary boundaryName="app-root-layout">
      <Layout pageProps={pageProps}>
        <Component {...pageProps} />
      </Layout>
    </ErrorBoundary>
  )
}

