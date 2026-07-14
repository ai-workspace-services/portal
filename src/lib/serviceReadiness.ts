export const SERVICE_READINESS_KEYS = ['email', 'password', 'mfa'] as const

export type ServiceReadinessKey = (typeof SERVICE_READINESS_KEYS)[number]

export type ServiceReadinessRequirement = {
  key: ServiceReadinessKey
  met: boolean
  hint: string
}

export type ServiceReadiness = {
  ready: boolean
  nextStep: ServiceReadinessKey | ''
  requirements: ServiceReadinessRequirement[]
}

const DEFAULT_HINTS: Record<ServiceReadinessKey, string> = {
  email: 'Verify your email address',
  password: 'Set an account password',
  mfa: 'Enable multi-factor authentication',
}

function isReadinessKey(value: unknown): value is ServiceReadinessKey {
  return typeof value === 'string' && SERVICE_READINESS_KEYS.includes(value as ServiceReadinessKey)
}

export function normalizeServiceReadiness(value: unknown): ServiceReadiness | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const source = value as Record<string, unknown>
  if (typeof source.ready !== 'boolean' || !Array.isArray(source.requirements)) {
    return null
  }

  const rawRequirements = source.requirements as unknown[]
  const requirements = SERVICE_READINESS_KEYS.map((key) => {
    const candidate = rawRequirements.find(
      (requirement) =>
        requirement &&
        typeof requirement === 'object' &&
        (requirement as Record<string, unknown>).key === key,
    ) as Record<string, unknown> | undefined

    return {
      key,
      met: Boolean(candidate?.met),
      hint: typeof candidate?.hint === 'string' && candidate.hint.trim() ? candidate.hint.trim() : DEFAULT_HINTS[key],
    }
  })

  const firstUnmet = requirements.find((requirement) => !requirement.met)?.key ?? ''
  const nextStep = isReadinessKey(source.nextStep) ? source.nextStep : firstUnmet

  return {
    ready: source.ready && requirements.every((requirement) => requirement.met),
    nextStep: source.ready ? '' : nextStep,
    requirements,
  }
}
