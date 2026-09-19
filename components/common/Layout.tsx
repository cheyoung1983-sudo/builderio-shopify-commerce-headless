import React from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider, Box, Button } from 'theme-ui'
import { ManagedUIContext, useUI } from '@components/common/context'
import Head from '@components/common/Head'
import Navbar from '@components/common/Navbar'
import { useAcceptCookies } from '@lib/hooks/useAcceptCookies'
import Sidebar from '@components/common/Sidebar'
import { CartSidebarView } from '@components/cart'
import { CartProvider } from '../../context/CartContext'
import { CommerceProvider } from '@lib/shopify/storefront-data-hooks'
import shopifyConfig from '@config/shopify'
import builderConfig from '@config/builder'
import { builder, BuilderContent, Builder } from '@builder.io/react'
import themesMap from '@config/theme'
import seoConfig from '@config/seo.json'
import NoSSR from './NoSSR'
import { ScrollProgressBar } from './ScrollProgressBar'
import { ScrollToTop } from './ScrollToTop'
import Footer from './Footer'
import AnnouncerProvider from './Announcer'
import { WishlistProvider, ToastProvider } from '../../context'
import { ToastContainer } from './Toast'
import ErrorBoundary from '@components/ErrorBoundary'

const FeatureBar = dynamic(() => import('@components/common/FeatureBar'), {
  ssr: false,
})

const Layout: React.FC<{ pageProps: any; children: React.ReactNode }> = ({
  children,
  pageProps,
}) => {
  const builderTheme = pageProps?.theme

  if (!builderConfig.apiKey && !builderTheme) {
    return (
      <CommerceProvider {...shopifyConfig}>
        <ManagedUIContext siteSettings={{}}>
          <Head seoInfo={seoConfig} />
          <InnerLayout themeName="base">
            {children}
          </InnerLayout>
        </ManagedUIContext>
      </CommerceProvider>
    )
  }

  return (
    <CommerceProvider {...shopifyConfig}>
      <BuilderContent content={builderTheme} modelName="theme">
        {(data, loading) => {
          if (loading && !builderTheme) {
            return (
              <ManagedUIContext siteSettings={{}}>
                <Head seoInfo={seoConfig} />
                <InnerLayout themeName="base">
                  {children}
                </InnerLayout>
              </ManagedUIContext>
            )
          }
          const siteSettings = data?.siteSettings || {}
          const colorOverrides = data?.colorOverrides
          const siteSeoInfo = data?.siteInformation
          return (
            <ManagedUIContext key={data?.id || 'default'} siteSettings={siteSettings}>
              <Head seoInfo={siteSeoInfo || seoConfig} />
              <InnerLayout
                themeName={data?.theme || 'base'}
                colorOverrides={colorOverrides}
              >
                {children}
              </InnerLayout>
            </ManagedUIContext>
          )
        }}
      </BuilderContent>
    </CommerceProvider>
  )
}

const InnerLayout: React.FC<{
  themeName: string
  children: React.ReactNode
  colorOverrides?: {
    text?: string
    background?: string
    primary?: string
    secondary?: string
    muted?: string
  }
}> = ({ themeName, children, colorOverrides }) => {
  const selectedTheme =
    (themeName && themesMap[themeName]) ||
    themesMap.base ||
    themesMap.default ||
    {}
  const theme = {
    ...selectedTheme,
    colors: {
      ...(selectedTheme.colors || {}),
      ...colorOverrides,
    },
  }
  const { displaySidebar, closeSidebar, openSidebar } = useUI()
  const { acceptedCookies, onAcceptCookies } = useAcceptCookies()
  return (
    <ThemeProvider theme={theme}>
      <AnnouncerProvider>
        <ToastProvider>
          <WishlistProvider>
            <CartProvider onOpen={openSidebar} onClose={closeSidebar}>
              <NoSSR>
                <ScrollProgressBar />
                <ScrollToTop />
              </NoSSR>
              <Navbar />
              <Box
                sx={{
                  margin: `0 auto`,
                  width: '100%',
                  maxWidth: '100%',
                  px: { xs: 4, sm: 6, lg: 8 },
                  minHeight: 800,
                }}
              >
                <ErrorBoundary name="MainContent">
                  <main>{children}</main>
                </ErrorBoundary>
              </Box>
              <Footer />

              <Sidebar
                open={
                  displaySidebar ||
                  (builder.editingModel || Builder.previewingModel) ===
                    'cart-upsell-sidebar'
                }
                onClose={closeSidebar}
              >
                <CartSidebarView />
              </Sidebar>
              <ToastContainer />
              <NoSSR>
                <FeatureBar
                  title="This site uses cookies to improve your experience. By clicking, you agree to our Privacy Policy."
                  hide={Builder.isEditing ? true : acceptedCookies}
                  action={
                    <Button onClick={() => onAcceptCookies()}>Accept cookies</Button>
                  }
                />
              </NoSSR>
            </CartProvider>
          </WishlistProvider>
        </ToastProvider>
      </AnnouncerProvider>
    </ThemeProvider>
  )
}

export default Layout
