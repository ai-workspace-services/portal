import type { DashboardExtension } from '../types'

import { userCenterExtension } from './user-center'
import { infraExtension } from './infra'
import { xconnectZeroExtension } from './xconnect-zero'

export const builtinExtensions: DashboardExtension[] = [
    userCenterExtension,
    infraExtension,
    xconnectZeroExtension,
]
