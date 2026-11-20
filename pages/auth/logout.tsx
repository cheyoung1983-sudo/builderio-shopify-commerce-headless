import Link from 'next/link'

export default function AuthLogout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 text-white px-4">
      <div className="max-w-md w-full text-center bg-neutral-800/90 p-8 rounded-2xl border border-neutral-700 shadow-xl">
        <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 text-xl font-bold">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Signed Out</h1>
        <p className="text-neutral-400 text-sm mb-6">
          You have been successfully signed out of Display &amp; Cell Pros.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  )
}
