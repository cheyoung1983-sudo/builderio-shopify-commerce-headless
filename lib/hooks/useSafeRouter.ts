import { useRouter as useNextRouter, NextRouter } from 'next/router'

const fallbackRouter: NextRouter = {
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  isFallback: false,
  basePath: '',
  locale: 'en-US',
  locales: ['en-US'],
  defaultLocale: 'en-US',
  isReady: true,
  isPreview: false,
  forward: () => {},
  push: async () => true,
  replace: async () => true,
  reload: () => {},
  back: () => {},
  prefetch: async () => {},
  beforePopState: () => {},
  events: {
    on: () => {},
    off: () => {},
    emit: () => {},
  },
} as unknown as NextRouter

export function useSafeRouter(): NextRouter {
  try {
    const router = useNextRouter()
    return router || fallbackRouter
  } catch {
    return fallbackRouter
  }
}

export default useSafeRouter
