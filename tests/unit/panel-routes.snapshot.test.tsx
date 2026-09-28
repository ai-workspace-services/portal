import { describe, expect, it } from 'vitest'

import { capabilities } from '@/config/capabilities.generated'
import { builtinExtensions } from '@/modules/extensions/builtin'
import { getExtensionRegistry } from '@extensions/loader'
import type { RegisteredRoute } from '@extensions/types'

type RouteSnapshot = {
  id: string | undefined
  path: string
  match: string
  section: string | null
  order: number | null
  hidden: boolean
  guard: Record<string, unknown>
}

const expectedPanelRouteSnapshot: Array<
  Pick<RouteSnapshot, 'id' | 'path' | 'match' | 'section' | 'order' | 'hidden' | 'guard'>
> = [
  { id: 'dashboard', path: '/panel', match: 'startsWith', section: 'workspace', order: 0, hidden: false, guard: { requireLogin: true } },
  { id: 'finops', path: '/panel/finops', match: 'exact', section: 'workspace', order: 1, hidden: false, guard: { requireLogin: true } },
  { id: 'globalMesh', path: '/panel/global-mesh', match: 'exact', section: 'workspace', order: 2, hidden: false, guard: { requireLogin: true } },
  { id: 'productsGlobalMesh', path: '/products/global-mesh', match: 'exact', section: 'workspace', order: 3, hidden: false, guard: {} },
  { id: 'agents', path: '/panel/agent', match: 'exact', section: 'admin', order: 9, hidden: false, guard: { requireLogin: true, roles: ['admin'] } },
  { id: 'apis', path: '/panel/api', match: 'exact', section: 'productivity', order: 11, hidden: false, guard: { requireLogin: true } },
  { id: 'ai-aggregator', path: '/panel/ai-aggregator', match: 'exact', section: 'productivity', order: 12, hidden: false, guard: { requireLogin: true } },
  { id: 'accounts', path: '/panel/account', match: 'exact', section: 'management', order: 20, hidden: true, guard: { requireLogin: true } },
  { id: 'subscription', path: '/panel/subscription', match: 'exact', section: 'management', order: 21, hidden: false, guard: { requireLogin: true } },
  { id: 'ldp', path: '/panel/ldp', match: 'exact', section: 'management', order: 22, hidden: false, guard: { requireLogin: true } },
  { id: 'appearance', path: '/panel/appearance', match: 'exact', section: 'preferences', order: 30, hidden: false, guard: { requireLogin: true } },
  { id: 'management', path: '/panel/management', match: 'startsWith', section: 'admin', order: 99, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'], permissions: ['admin.settings.read', 'admin.users.metrics.read', 'admin.users.list.read', 'admin.agents.status.read', 'admin.blacklist.read'] } },
  { id: 'ops', path: '/panel/ops', match: 'startsWith', section: 'admin', order: 10, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'] } },
  { id: 'ops-accounts', path: '/panel/ops/accounts', match: 'startsWith', section: 'admin', order: 11, hidden: true, guard: { requireLogin: true, roles: ['admin', 'operator'] } },
  { id: 'ops-billing-plans', path: '/panel/ops/billing/plans', match: 'startsWith', section: 'admin', order: 12, hidden: true, guard: { requireLogin: true, roles: ['admin', 'operator'] } },
  { id: 'ops-billing-ledger', path: '/panel/ops/billing/ledger', match: 'startsWith', section: 'admin', order: 12, hidden: true, guard: { requireLogin: true, roles: ['admin', 'operator'] } },
  { id: 'ops-audit', path: '/panel/ops/audit', match: 'startsWith', section: 'admin', order: 12, hidden: true, guard: { requireLogin: true, roles: ['admin', 'operator'] } },
  { id: 'ops-system', path: '/panel/ops/system', match: 'startsWith', section: 'admin', order: 12, hidden: true, guard: { requireLogin: true, roles: ['admin', 'operator'] } },
  { id: 'deployments', path: '/panel/deployments', match: 'exact', section: 'infra', order: 0, hidden: false, guard: { requireLogin: true } },
  { id: 'resources', path: '/panel/resources', match: 'exact', section: 'infra', order: 1, hidden: false, guard: { requireLogin: true } },
  { id: 'apiKeys', path: '/panel/api-keys', match: 'exact', section: 'infra', order: 2, hidden: false, guard: { requireLogin: true } },
  { id: 'logs', path: '/panel/observability', match: 'exact', section: 'infra', order: 3, hidden: false, guard: { requireLogin: true } },
  { id: 'settings', path: '/panel/settings', match: 'exact', section: 'preferences', order: 99, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'], permissions: ['admin.settings.read'] } },
  { id: 'xconnectZero', path: '/panel/xconnect-zero', match: 'exact', section: 'management', order: 23, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator', 'user'], permissions: ['xconnect.zero.read'] } },
  { id: 'platformOperations', path: '/panel/operations', match: 'exact', section: 'management', order: 24, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'], permissions: ['platform.ops.read'], groups: ['platform-ops', 'platform-operations'], tenantScoped: true } },
  { id: 'platformOperationsReleases', path: '/panel/operations/releases', match: 'exact', section: 'management', order: 25, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'], permissions: ['platform.ops.read'], groups: ['platform-ops', 'platform-operations'], tenantScoped: true } },
  { id: 'platformOperationsEnvironments', path: '/panel/operations/environments', match: 'exact', section: 'management', order: 26, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'], permissions: ['platform.ops.read'], groups: ['platform-ops', 'platform-operations'], tenantScoped: true } },
  { id: 'platformOperationsAudit', path: '/panel/operations/audit', match: 'exact', section: 'management', order: 27, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'], permissions: ['platform.ops.read'], groups: ['platform-ops', 'platform-operations'], tenantScoped: true } },
  { id: 'platformOperationsVault', path: '/panel/operations/vault-access', match: 'exact', section: 'management', order: 28, hidden: false, guard: { requireLogin: true, roles: ['admin', 'operator'], permissions: ['platform.ops.read'], groups: ['platform-ops', 'platform-operations'], tenantScoped: true } },
]

function snapshotRoute(route: RegisteredRoute): RouteSnapshot {
  return {
    id: route.id,
    path: route.path,
    match: route.match ?? 'exact',
    section: route.sidebar?.section ?? null,
    order: route.sidebar?.order ?? null,
    hidden: route.sidebar?.hidden ?? false,
    guard: route.guard ?? {},
  }
}

describe('capability-driven panel routes', () => {
  it('uses manifest membership and order for every builtin extension', () => {
    const registry = getExtensionRegistry()
    const runtimeIds = builtinExtensions.map(
      (extension) => `portal.builtin.${extension.id.replace(/^builtin\./, '').replaceAll('-', '_')}`,
    )

    expect(runtimeIds).toEqual(capabilities.builtinModuleIds)
    expect(registry.extensions.map((extension) => extension.id)).toEqual([
      'builtin.user-center',
      'builtin.infra',
      'builtin.xconnect-zero',
      'builtin.platform-operations',
    ])
  })

  it('keeps the pre-existing panel route, sidebar, and guard snapshot', () => {
    const registry = getExtensionRegistry()
    expect(registry.routes.map(snapshotRoute)).toEqual(expectedPanelRouteSnapshot)
  })

  it('projects route metadata from the generated capability contracts', () => {
    const registry = getExtensionRegistry()
    for (const [moduleId, contracts] of Object.entries(capabilities.builtinRouteContracts)) {
      const extension = registry.extensions.find(
        (candidate) => `portal.builtin.${candidate.id.replace(/^builtin\./, '').replaceAll('-', '_')}` === moduleId,
      )
      expect(extension, moduleId).toBeDefined()
      expect(extension?.routes.map(snapshotRoute)).toEqual(contracts.map((contract) => ({
        id: contract.id,
        path: contract.path,
        match: ('match' in contract ? contract.match : undefined) ?? 'exact',
        section: contract.sidebar?.section ?? null,
        order: contract.sidebar?.order ?? null,
        hidden: (contract.sidebar && 'hidden' in contract.sidebar ? contract.sidebar.hidden : undefined) ?? false,
        guard: contract.guard,
      })))
    }
  })
})
