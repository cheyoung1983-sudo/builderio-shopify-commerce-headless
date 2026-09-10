import type { GetStaticPropsContext, GetStaticPathsContext } from 'next'

export async function getStaticProps({ params }: GetStaticPropsContext<{ path: string[] }>) {
  return {
    props: {
      path: params?.path || [],
    },
    revalidate: 5,
  }
}

export async function getStaticPaths({ locales }: GetStaticPathsContext) {
  return {
    paths: [{ params: { path: [] } }],
    fallback: true,
  }
}

export default function Path({ path }: { path: string[] }) {
  return <div>Path Page: {JSON.stringify(path)}</div>
}
