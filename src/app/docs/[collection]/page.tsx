export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'

import { getDocResource } from '../resources.server'
import { isFeatureEnabled } from '@lib/featureToggles'

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>
}) {
  if (!isFeatureEnabled('appModules', '/docs')) {
    notFound()
  }

  const resolvedParams = await params
  const doc = await getDocResource(resolvedParams.collection)
  if (!doc) {
    notFound()
  }

  const defaultVersion = doc.versions.find((version) => version.slug === doc.defaultVersionSlug) ?? doc.versions[0]
  if (!defaultVersion) {
    notFound()
  }

  redirect(`/docs/${doc.slug}/${defaultVersion.slug}`)
}
