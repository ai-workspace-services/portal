import featureToggleData from '../config/feature-toggles.json'

export type ReleaseChannel = 'stable' | 'beta' | 'develop'
export type RuntimeEnvironment = 'uat' | 'prod' | 'dev'

export type FeatureToggleNode = {
  name?: string
  description?: string
  description_en?: string
  enabled?: boolean
  channel?: ReleaseChannel
  children?: Record<string, FeatureToggleNode>
  features?: Record<string, FeatureToggleNode>
}

export type UserCenterCategory = {
  name: string
  description: string
  description_en?: string
  channel: ReleaseChannel
  enabled?: boolean
  features: Record<string, { name: string; enabled?: boolean; channel: ReleaseChannel }>
}

const featureToggles = featureToggleData as {
  environments?: Record<string, { policy: string; allowedChannels: ReleaseChannel[]; description: string }>
  userCenter?: {
    enabled?: boolean
    description?: string
    categories: Record<string, UserCenterCategory>
  }
  globalNavigation: FeatureToggleNode
  appModules: FeatureToggleNode
  cmsExperience: FeatureToggleNode
}

export type FeatureToggleSection = keyof typeof featureToggles

const DYNAMIC_SEGMENT_PATTERN = /^\[(\.\.\.)?.+\]$/

export function resolveRuntimeEnvironment(): RuntimeEnvironment {
  const envVar = (
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_RUNTIME_ENVIRONMENT || process.env.RUNTIME_ENV)) ||
    ''
  )
    .trim()
    .toLowerCase()

  if (envVar === 'uat' || envVar === 'prod' || envVar === 'dev' || envVar === 'sit') {
    return envVar === 'sit' ? 'uat' : (envVar as RuntimeEnvironment)
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase()
    if (
      host.includes('-uat.') ||
      host.includes('uat') ||
      host.includes('localhost') ||
      host.includes('127.0.0.1')
    ) {
      return 'uat'
    }
    if (host.endsWith('svc.plus')) {
      return 'prod'
    }
  }

  const siteUrl = ((typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) || '').toLowerCase()
  if (siteUrl.includes('uat') || siteUrl.includes('onwalk.net')) {
    return 'uat'
  }
  if (siteUrl.includes('svc.plus')) {
    return 'prod'
  }

  return 'prod'
}

/**
 * 校验指定发布渠道在当前环境中是否允许开放:
 * - UAT 环境: 全部开放 (stable, beta, develop)
 * - PROD 环境: 只开放 stable 部分
 */
export function isChannelAllowed(
  channel?: ReleaseChannel,
  env: RuntimeEnvironment = resolveRuntimeEnvironment()
): boolean {
  if (!channel) {
    return true
  }
  if (env === 'uat' || env === 'dev') {
    return true
  }
  return channel === 'stable'
}

const normalizeSegments = (pathname: string = '') =>
  pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)

const findDynamicChildKey = (children: Record<string, FeatureToggleNode>) =>
  Object.keys(children).find((key) => DYNAMIC_SEGMENT_PATTERN.test(key))

type ResolveResult = {
  enabled: boolean
  node?: FeatureToggleNode
}

const resolveToggleNode = (
  node: FeatureToggleNode | undefined,
  segments: string[],
  env: RuntimeEnvironment = resolveRuntimeEnvironment()
): ResolveResult => {
  if (!node) {
    return { enabled: true }
  }

  const isExplicitlyDisabled = node.enabled === false
  if (isExplicitlyDisabled) {
    return { enabled: false, node }
  }

  if (node.channel && !isChannelAllowed(node.channel, env)) {
    return { enabled: false, node }
  }

  if (segments.length === 0) {
    return { enabled: true, node }
  }

  const children = node.children || node.features || {}
  const [current, ...rest] = segments
  const exactChild = children[current]
  const dynamicChildKey = findDynamicChildKey(children)
  const wildcardChild = children['*']
  const nextNode = exactChild ?? (dynamicChildKey ? children[dynamicChildKey] : undefined) ?? wildcardChild

  if (!nextNode) {
    return { enabled: true, node }
  }

  return resolveToggleNode(nextNode, rest, env)
}

const resolveSection = (
  section: FeatureToggleSection,
  pathname: string,
  env: RuntimeEnvironment = resolveRuntimeEnvironment()
): ResolveResult => {
  const tree = featureToggles[section]
  if (!tree) {
    return { enabled: true }
  }

  const segments = normalizeSegments(pathname)
  return resolveToggleNode(tree as FeatureToggleNode, segments, env)
}

export const isFeatureEnabled = (
  section: FeatureToggleSection,
  pathname: string,
  env: RuntimeEnvironment = resolveRuntimeEnvironment()
) => resolveSection(section, pathname, env).enabled

export const getFeatureToggleInfo = (
  section: FeatureToggleSection,
  pathname: string,
  env: RuntimeEnvironment = resolveRuntimeEnvironment()
): { enabled: boolean; channel?: ReleaseChannel } => {
  const result = resolveSection(section, pathname, env)
  return {
    enabled: result.enabled,
    channel: result.node?.channel,
  }
}

/**
 * 判断用户中心四大类下特定功能是否对当前环境开放
 */
export function isUserCenterFeatureEnabled(
  categoryKey: 'xworkmate' | 'xconnect' | 'ai_workspace' | 'open_platform' | string,
  featureKey: string,
  env: RuntimeEnvironment = resolveRuntimeEnvironment()
): boolean {
  const categories = featureToggles.userCenter?.categories
  if (!categories) {
    return true
  }
  const category = categories[categoryKey]
  if (!category || category.enabled === false || (category.channel && !isChannelAllowed(category.channel, env))) {
    return false
  }
  const feature = category.features?.[featureKey]
  if (!feature) {
    return true
  }
  if (feature.enabled === false) {
    return false
  }
  return isChannelAllowed(feature.channel, env)
}

/**
 * 获取当前环境下用户中心四大类的生效状态矩阵
 */
export function getUserCenterCategories(env: RuntimeEnvironment = resolveRuntimeEnvironment()) {
  const rawCategories = featureToggles.userCenter?.categories || {}
  const result: Record<
    string,
    UserCenterCategory & {
      isAvailable: boolean
      activeFeatures: Record<string, { name: string; enabled: boolean; channel: ReleaseChannel }>
    }
  > = {}

  for (const [catKey, category] of Object.entries(rawCategories)) {
    const isCatAvailable = category.enabled !== false && isChannelAllowed(category.channel, env)
    const activeFeatures: Record<string, { name: string; enabled: boolean; channel: ReleaseChannel }> = {}

    for (const [featKey, feat] of Object.entries(category.features || {})) {
      const isFeatAvailable = isCatAvailable && feat.enabled !== false && isChannelAllowed(feat.channel, env)
      activeFeatures[featKey] = {
        ...feat,
        enabled: isFeatAvailable,
      }
    }

    result[catKey] = {
      ...category,
      isAvailable: isCatAvailable,
      activeFeatures,
    }
  }

  return result
}

export const getFeatureToggleTree = () => featureToggles

