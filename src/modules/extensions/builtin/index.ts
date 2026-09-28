import {
    capabilities,
    type CapabilityRouteContract,
} from '@/config/capabilities.generated'
import type { DashboardExtension } from '../types'

import { userCenterExtension } from './user-center'
import { infraExtension } from './infra'
import { xconnectZeroExtension } from './xconnect-zero'
import { platformOperationsExtension } from './platform-operations'

const implementations: Record<string, DashboardExtension> = {
    'portal.builtin.user_center': userCenterExtension,
    'portal.builtin.infra': infraExtension,
    'portal.builtin.xconnect_zero': xconnectZeroExtension,
    'portal.builtin.platform_operations': platformOperationsExtension,
}

type BuiltinModuleId = (typeof capabilities.builtinModuleIds)[number]

function projectExtension(moduleId: BuiltinModuleId): DashboardExtension {
    const implementation = implementations[moduleId]
    const contracts = capabilities.builtinRouteContracts[moduleId]

    if (!implementation || !contracts) {
        throw new Error(`No builtin extension implementation or contract for ${moduleId}`)
    }

    const implementationRoutes = new Map(
        implementation.routes.map((route) => [route.id ?? route.path, route]),
    )
    const routes = contracts.map((contract) => {
        const implementationRoute = implementationRoutes.get(contract.id)
        if (!implementationRoute || implementationRoute.path !== contract.path) {
            throw new Error(
                `Builtin route implementation drift for ${moduleId}:${contract.id} (${contract.path})`,
            )
        }

        return applyRouteContract(implementationRoute, contract)
    })

    if (routes.length !== implementation.routes.length) {
        throw new Error(`Builtin route contract is incomplete for ${moduleId}`)
    }

    return {
        ...implementation,
        routes,
    }
}

function applyRouteContract(
    implementationRoute: DashboardExtension['routes'][number],
    contract: CapabilityRouteContract,
): DashboardExtension['routes'][number] {
    return {
        ...implementationRoute,
        id: contract.id,
        path: contract.path,
        label: contract.label,
        description: contract.description,
        match: contract.match,
        guard: {
            ...contract.guard,
            roles: contract.guard.roles ? [...contract.guard.roles] : undefined,
            permissions: contract.guard.permissions ? [...contract.guard.permissions] : undefined,
            groups: contract.guard.groups ? [...contract.guard.groups] : undefined,
        },
        redirect: contract.redirect,
        sidebar: contract.sidebar,
        featureFlag: contract.featureFlag,
    }
}

// The manifest owns extension membership and ordering. The implementation map
// only supplies executable loaders/icons; route metadata and access policy are
// projected from capabilities.generated.ts.
export const builtinExtensions: DashboardExtension[] = capabilities.builtinModuleIds.map(
    projectExtension,
)
