import type { DashboardExtension } from '../types'

import { userCenterExtension } from './user-center'
import { infraExtension } from './infra'
import { xconnectZeroExtension } from './xconnect-zero'
import { platformOperationsExtension } from './platform-operations'

export const builtinExtensions: DashboardExtension[] = [
    userCenterExtension,
    infraExtension,
    xconnectZeroExtension,
    platformOperationsExtension,
]
