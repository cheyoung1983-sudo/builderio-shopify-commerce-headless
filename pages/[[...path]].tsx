import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import { useSafeRouter } from '@lib/hooks/useSafeRouter'
import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import { getLayoutProps } from '@lib/get-layout-props'
import builderConfig from '@config/builder'
import Head from 'next/head'
import { useThemeUI } from '@theme-ui/core'

if (builderConfig.apiKey) {
  builder.init(builderConfig.apiKey)
}

const builderModel = 'page'

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ path?: string[] }>) {
  const path = params?.path || []
  const urlPath = `/${path.join('/')}`.replace(/\/$/, '') || '/'
  const page = await resolveBuilderContent(builderModel, locale, { urlPath })

  if (!page) {
    return {
      notFound: true,
      revalidate: 30,
    }
  }

  return {
    props: {
      page,
      ...(await getLayoutProps()),
    },
    revalidate: 30,
  }
}

export async function getStaticPaths({ locales }: GetStaticPathsContext) {
  return {
    paths: locales?.flatMap((locale) => [{ params: { path: [] }, locale }]) || [{ params: { path: [] } }],
    fallback: 'blocking',
  }
}

export default function Path({
  page,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useSafeRouter()
  const isPreviewing = useIsPreviewing()
  const isLive = !isPreviewing
  const { theme } = useThemeUI()

  if (!page && isLive) {
    return (
      <>
        <Head>
          <meta name="robots" content="noindex" />
          <meta name="title"></meta>
        </Head>
        <main>Page not found</main>
      </>
    )
  }

  return router.isFallback && isLive ? (
    <h1>Loading...</h1>
  ) : (
    <BuilderComponent
      key={page?.id || 'page'}
      options={{ enrich: true }}
      model={builderModel}
      data={{ theme }}
      content={page}
    />
  )
}
