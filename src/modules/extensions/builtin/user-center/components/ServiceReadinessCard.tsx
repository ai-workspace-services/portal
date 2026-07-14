'use client'

import { CheckCircle2, ChevronRight, Circle, KeyRound, Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { normalizeServiceReadiness, type ServiceReadiness, type ServiceReadinessKey } from '@lib/serviceReadiness'
import { useUserStore } from '@lib/userStore'

const STEP_META: Record<ServiceReadinessKey, { label: string; icon: typeof MailCheck }> = {
  email: { label: 'Verify email', icon: MailCheck },
  password: { label: 'Set password', icon: KeyRound },
  mfa: { label: 'Enable MFA', icon: ShieldCheck },
}

type ServiceReadinessCardProps = {
  initialReadiness?: ServiceReadiness
  onReady?: () => void
}

export default function ServiceReadinessCard({ initialReadiness, onReady }: ServiceReadinessCardProps) {
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const refreshUser = useUserStore((state) => state.refresh)
  const [readiness, setReadiness] = useState<ServiceReadiness | null>(initialReadiness ?? user?.serviceReadiness ?? null)
  const [loading, setLoading] = useState(!initialReadiness && !user?.serviceReadiness)
  const [password, setPassword] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReadiness = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/account/service-readiness', { credentials: 'include', cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as { readiness?: unknown }
      const nextReadiness = normalizeServiceReadiness(payload.readiness)
      if (!response.ok || !nextReadiness) {
        throw new Error('Unable to load account readiness.')
      }
      setReadiness(nextReadiness)
      if (nextReadiness.ready) onReady?.()
    } catch (loadError) {
      console.warn('Failed to load advanced-service readiness', loadError)
      setError('We could not load your account readiness. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [onReady])

  useEffect(() => {
    if (!initialReadiness && !user?.serviceReadiness) void loadReadiness()
  }, [initialReadiness, loadReadiness, user?.serviceReadiness])

  useEffect(() => {
    if (initialReadiness) setReadiness(initialReadiness)
  }, [initialReadiness])

  const nextStep = useMemo(() => readiness?.nextStep ?? '', [readiness?.nextStep])

  const handlePasswordSet = useCallback(async () => {
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    setSubmittingPassword(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/password/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Unable to set password.')
      }
      setPassword('')
      await refreshUser()
      await loadReadiness()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to set password.')
    } finally {
      setSubmittingPassword(false)
    }
  }, [loadReadiness, password, refreshUser])

  const startStep = useCallback(
    (step: ServiceReadinessKey) => {
      setError(null)
      if (step === 'email') {
        const email = user?.email ? `?email=${encodeURIComponent(user.email)}` : ''
        router.push(`/email-verification${email}`)
      } else if (step === 'mfa') {
        router.push('/panel/account?setupMfa=1')
      }
    },
    [router, user?.email],
  )

  if (loading && !readiness) {
    return <div className="rounded-2xl border border-[color:var(--color-surface-border)] p-6 text-sm text-[var(--color-text-subtle)]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading account readiness…</div>
  }

  if (!readiness) return null

  if (readiness.ready) {
    return (
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          <div><h2 className="font-semibold">Advanced services unlocked</h2><p className="mt-1 text-sm">Your account meets the email, password, and MFA requirements.</p></div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)]/30 p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Advanced services</p><h2 className="mt-1 text-xl font-bold text-[var(--color-heading)]">Finish account security setup</h2><p className="mt-2 max-w-2xl text-sm text-[var(--color-text-subtle)]">Dedicated resources and advanced automations unlock after these three security checks are complete.</p></div>
        <button type="button" onClick={() => void loadReadiness()} className="text-sm font-medium text-[var(--color-primary)] hover:underline">Refresh</button>
      </div>
      <div className="mt-5 space-y-3">
        {readiness.requirements.map((requirement) => {
          const meta = STEP_META[requirement.key]
          const Icon = meta.icon
          const current = requirement.key === nextStep
          return <div key={requirement.key} className={`rounded-xl border p-4 ${current ? 'border-[color:var(--color-primary)] bg-[var(--color-surface)]' : 'border-[color:var(--color-surface-border)] bg-[var(--color-surface)]/70'}`}>
            <div className="flex items-center gap-3"><span className={requirement.met ? 'text-emerald-500' : 'text-[var(--color-text-subtle)]'}>{requirement.met ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</span><Icon className="h-5 w-5 text-[var(--color-primary)]" /><div className="min-w-0 flex-1"><p className="font-medium text-[var(--color-heading)]">{meta.label}{current ? <span className="ml-2 text-xs font-semibold text-[var(--color-primary)]">CURRENT STEP</span> : null}</p><p className="text-sm text-[var(--color-text-subtle)]">{requirement.met ? 'Complete' : requirement.hint}</p></div>{!requirement.met && requirement.key !== 'password' ? <button type="button" onClick={() => startStep(requirement.key)} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline">Continue <ChevronRight className="h-4 w-4" /></button> : null}</div>
            {!requirement.met && requirement.key === 'password' && current ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input aria-label="New account password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password (8+ characters)" className="min-w-0 flex-1 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm" /><button type="button" disabled={submittingPassword} onClick={() => void handlePasswordSet()} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-60">{submittingPassword ? 'Saving…' : 'Set password'}</button></div> : null}
          </div>
        })}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-[var(--color-danger-foreground)]">{error}</p> : null}
    </section>
  )
}
