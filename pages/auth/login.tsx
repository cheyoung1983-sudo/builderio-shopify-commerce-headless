import { useEffect } from 'react'

export default function AuthLogin() {
  useEffect(() => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/api/auth/login'
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 text-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-neutral-300 font-medium">Redirecting to Auth0 sign in...</p>
      </div>
    </div>
  )
}
