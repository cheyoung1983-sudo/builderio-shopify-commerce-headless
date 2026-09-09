import React from 'react'
import Head from 'next/head'
import Link from '@components/common/Link'
import { Box, Heading, Text, Button } from 'theme-ui'
import { useUI } from '@components/common/context'
import { getLayoutProps } from '@lib/get-layout-props'
import type { GetStaticProps } from 'next'

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      ...(await getLayoutProps()),
    },
  }
}

export default function NotFoundPage() {
  const { openSidebar } = useUI()

  return (
    <>
      <Head>
        <title>Page Not Found - 404</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Box
        sx={{
          maxWidth: 640,
          mx: 'auto',
          py: [5, 6],
          px: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            p: [4, 5],
            borderRadius: 12,
            bg: 'muted',
            border: '1px solid',
            borderColor: 'border',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <Heading
            as="h1"
            sx={{
              fontSize: [5, 6],
              fontWeight: 'bold',
              color: 'primary',
              mb: 2,
            }}
          >
            404
          </Heading>
          <Heading as="h2" sx={{ fontSize: [3, 4], mb: 3 }}>
            Page Not Found
          </Heading>
          <Text
            sx={{
              fontSize: 2,
              color: 'text',
              mb: 4,
              display: 'block',
              lineHeight: 1.6,
            }}
          >
            The page you are looking for doesn&apos;t exist, has been moved, or has not yet been published in Builder.io.
          </Text>
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/">
              <Button
                sx={{
                  cursor: 'pointer',
                  bg: 'primary',
                  color: 'background',
                  px: 4,
                  py: 2,
                  borderRadius: 6,
                }}
              >
                Back to Home
              </Button>
            </Link>
            <Button
              onClick={openSidebar}
              sx={{
                cursor: 'pointer',
                bg: 'transparent',
                color: 'primary',
                border: '1px solid',
                borderColor: 'primary',
                px: 4,
                py: 2,
                borderRadius: 6,
              }}
            >
              View Cart
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  )
}
