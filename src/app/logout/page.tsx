import { Suspense } from 'react'

import { LogoutClient } from './LogoutClient'

// Same cross-boundary constraint as /login: this route lives in the auth
// build, and a prerendered page makes links from other boundaries hang
// silently instead of falling back to a full page load.
export const dynamic = 'force-dynamic'

function LogoutFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-gray-100">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-transparent" />
        </div>
      </main>
    </div>
  )
}

export default function LogoutPage() {
  return (
    <Suspense fallback={<LogoutFallback />}>
      <LogoutClient />
    </Suspense>
  )
}
