'use client'

import type { ReactNode } from 'react'

import ServiceReadinessCard from './ServiceReadinessCard'
import { useUserStore } from '@lib/userStore'

type AdvancedServiceGateProps = { children: ReactNode; serviceName: string }

/** Reusable client-side entry gate; server handlers must enforce this too. */
export default function AdvancedServiceGate({ children, serviceName }: AdvancedServiceGateProps) {
  const readiness = useUserStore((state) => state.user?.serviceReadiness)
  if (readiness?.ready) return <>{children}</>

  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">{serviceName}</p><h1 className="mt-1 text-2xl font-bold text-[var(--color-heading)]">This advanced service needs a secured account</h1><p className="mt-2 text-sm text-[var(--color-text-subtle)]">Complete the progressive setup below before connecting dedicated service resources.</p></div><ServiceReadinessCard initialReadiness={readiness} /></div>
}
