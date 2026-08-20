import 'server-only'

import { cache } from 'react'

import { getDocCollections as loadDocCollections, getDocPage, getDocsHome } from '@lib/docsServiceClient'
import { isFeatureEnabled } from '@lib/featureToggles'
import type { DocCollection } from './types'

const isDocsModuleEnabled = () => isFeatureEnabled('appModules', '/docs')

export const getDocCollections = cache(async (): Promise<DocCollection[]> => {
  if (!isDocsModuleEnabled()) {
    return []
  }
  return loadDocCollections()
})

export const getDocCollectionsForBuildTime = getDocCollections

export const getDocsHomeContent = cache(async () => {
  if (!isDocsModuleEnabled()) {
    return undefined
  }
  return getDocsHome()
})

export async function getDocResources(): Promise<DocCollection[]> {
  return getDocCollections()
}

export async function getDocResource(slug: string): Promise<DocCollection | undefined> {
  if (!isDocsModuleEnabled()) {
    return undefined
  }

  const collections = await getDocCollections()
  return collections.find((doc) => doc.slug === slug)
}

/**
 * Every `(collection, slug)` pair the content service currently knows about, so
 * `/docs/[collection]/[...slug]` can be prerendered instead of rendered per
 * request. Returns an empty list when docs are disabled or the service is
 * unreachable, which downgrades the route to render-on-first-request.
 */
export async function getDocVersionParams(): Promise<Array<{ collection: string; slug: string[] }>> {
  if (!isDocsModuleEnabled()) {
    return []
  }
  try {
    const collections = await getDocCollections()
    return collections.flatMap((collection) =>
      (collection.versions ?? []).map((version) => ({
        collection: collection.slug,
        slug: version.slug.split('/'),
      })),
    )
  } catch (error) {
    console.warn('Skipping docs prerender: content service unavailable', error)
    return []
  }
}

/** Collection slugs, for prerendering `/docs/[collection]`. */
export async function getDocCollectionParams(): Promise<Array<{ collection: string }>> {
  if (!isDocsModuleEnabled()) {
    return []
  }
  try {
    const collections = await getDocCollections()
    return collections.map((collection) => ({ collection: collection.slug }))
  } catch (error) {
    console.warn('Skipping docs prerender: content service unavailable', error)
    return []
  }
}

export async function getDocVersion(collectionSlug: string, slugSegments: string | string[]) {
  if (!isDocsModuleEnabled()) {
    return undefined
  }
  const targetSlug = Array.isArray(slugSegments) ? slugSegments.join('/') : slugSegments
  try {
    return await getDocPage(collectionSlug, targetSlug)
  } catch {
    return undefined
  }
}
