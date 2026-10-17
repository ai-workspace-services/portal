// The panel is session- and tenant-scoped. Do not let the SSR boundary cache
// a user-specific RSC payload as a static page across tenants or deployments.
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { resolveExtensionRouteComponent } from '@extensions/loader'

export default async function PanelHome() {
  try {
    const Component = await resolveExtensionRouteComponent('/panel')
    return <Component />
  } catch (error) {
    if (error instanceof Error && error.message.includes('disabled')) {
      redirect('/panel')
    }
    throw error
  }
}
