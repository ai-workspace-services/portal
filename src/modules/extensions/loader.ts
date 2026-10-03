import { createFeatureFlag } from '@lib/featureFlags'
import { isUserCenterFeatureEnabled, resolveRuntimeEnvironment } from '@lib/featureToggles'

import { builtinExtensions } from './builtin'
import type {
  DashboardExtension,
  ExtensionRegistry,
  RegisteredExtension,
  RegisteredRoute,
  SidebarItem,
  SidebarSection,
} from './types'

let registryCache: ExtensionRegistry | undefined

function instantiateExtension(definition: DashboardExtension): RegisteredExtension {
  const extensionFlag = definition.featureFlag ? createFeatureFlag(definition.featureFlag) : undefined
  const extensionEnabled = extensionFlag ? extensionFlag.enabled : true

  const registered: RegisteredExtension = {
    ...definition,
    featureFlag: extensionFlag,
    enabled: extensionEnabled,
    routes: [],
  }

  registered.routes = definition.routes.map((route) => {
    const routeFlag = route.featureFlag ? createFeatureFlag(route.featureFlag) : undefined
    let routeEnabled = extensionEnabled && (routeFlag ? routeFlag.enabled : true)

    // AI Aggregator 作为非 stable 的开发中特性，在 PROD 用户中心对注册用户默认不开放，在 UAT 环境全面开放
    if (route.id === 'ai-aggregator' || route.featureFlag?.id === 'user-center.ai_aggregator') {
      const runtimeEnv = resolveRuntimeEnvironment()
      const allowedByToggle = isUserCenterFeatureEnabled('xconnect', 'ai_aggregator', runtimeEnv)
      const explicitEnv = process.env.NEXT_PUBLIC_FEATURE_AI_AGGREGATOR
      if (explicitEnv === '1' || explicitEnv === 'true') {
        routeEnabled = true
      } else if (explicitEnv === '0' || explicitEnv === 'false') {
        routeEnabled = false
      } else {
        routeEnabled = allowedByToggle
      }
    }

    const registeredRoute: RegisteredRoute = {
      ...route,
      extensionId: definition.id,
      extension: registered,
      enabled: routeEnabled,
      featureFlag: routeFlag,
    }

    return registeredRoute
  })

  return registered
}

function buildSidebar(routes: RegisteredRoute[]): SidebarSection[] {
  const sectionMap = new Map<string, SidebarSection>()

  routes.forEach((route) => {
    if (!route.sidebar || route.sidebar.hidden) {
      return
    }

    const { section, order } = route.sidebar
    const sectionId = section
    let entry = sectionMap.get(sectionId)
    if (!entry) {
      entry = { id: sectionId, title: section, order, items: [] }
      sectionMap.set(sectionId, entry)
    }

    const item: SidebarItem = {
      route,
      disabled: !route.enabled,
    }

    entry.items.push(item)
  })

  const sortedSections = Array.from(sectionMap.values()).sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) {
      return orderA - orderB
    }
    return a.title.localeCompare(b.title, 'zh-CN')
  })

  sortedSections.forEach((section) => {
    section.items.sort((a, b) => {
      const orderA = a.route.sidebar?.order ?? Number.MAX_SAFE_INTEGER
      const orderB = b.route.sidebar?.order ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.route.label.localeCompare(b.route.label, 'zh-CN')
    })
  })

  return sortedSections
}

function createRegistry(): ExtensionRegistry {
  const extensions = builtinExtensions.map(instantiateExtension)
  const routes = extensions.flatMap((extension) => extension.routes)
  const routeMap = new Map<string, RegisteredRoute>()

  routes.forEach((route) => {
    if (!routeMap.has(route.path)) {
      routeMap.set(route.path, route)
    }
  })

  const sidebar = buildSidebar(routes)

  return {
    extensions,
    routes,
    sidebar,
    getRoute: (path: string) => routeMap.get(path),
    resolveComponent: async (path: string) => {
      const route = routeMap.get(path)
      if (!route) {
        throw new Error(`No extension route registered for path: ${path}`)
      }
      if (!route.enabled) {
        throw new Error(`Extension route is disabled: ${path}`)
      }
      const loadedModule = await route.loader()
      return loadedModule.default
    },
  }
}

export function getExtensionRegistry(): ExtensionRegistry {
  if (!registryCache) {
    registryCache = createRegistry()
  }
  return registryCache
}

export async function resolveExtensionRouteComponent(path: string) {
  const registry = getExtensionRegistry()
  return registry.resolveComponent(path)
}

export function resetExtensionRegistryCache() {
  registryCache = undefined
}
