import type {
  GetStaticPathsContext,
  GetStaticPropsContext,
  InferGetStaticPropsType,
} from 'next'
import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react'
import { resolveBuilderContent } from '@lib/resolve-builder-content'
import { getLayoutProps } from '@lib/get-layout-props'
import builderConfig from '@config/builder'

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
      revalidate: 5,
    }
  }

  return {
    props: {
      page,
      ...(await getLayoutProps()),
    },
    revalidate: 5,
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
  const isPreviewing = useIsPreviewing()

  if (!page && !isPreviewing) {
    return <main>Page not found</main>
  }

  return <BuilderComponent model={builderModel} content={page} />
}
