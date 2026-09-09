import React from 'react'
import Head from 'next/head'
import type { NextPageContext } from 'next'
import Link from '@components/common/Link'
import { Box, Heading, Text, Button } from 'theme-ui'

interface ErrorProps {
  statusCode?: number
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <>
      <Head>
        <title>{statusCode ? `${statusCode} - An Error Occurred` : 'Error'}</title>
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
            {statusCode || 'Oops'}
          </Heading>
          <Heading as="h2" sx={{ fontSize: [3, 4], mb: 3 }}>
            {statusCode
              ? `An error ${statusCode} occurred on the server`
              : 'An unexpected error occurred'}
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
            Please try refreshing the page or returning to the storefront home.
          </Text>
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
        </Box>
      </Box>
    </>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default ErrorPage
