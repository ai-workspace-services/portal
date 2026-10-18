'use client'

import { ExternalLink, QrCode, Smartphone } from 'lucide-react'

const STORE_LINKS = [
  {
    label: 'App Store',
    href: 'https://apps.apple.com/app/google-authenticator/id388497605',
  },
  {
    label: 'Google Play',
    href: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
  },
]

export default function AuthenticatorInstallHelp() {
  return (
    <div className="mt-7 border-t border-[color:var(--color-primary-border)] pt-4">
      <div
        aria-hidden="true"
        className="relative mx-auto flex h-24 max-w-44 items-center justify-between px-3"
      >
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-[color:var(--color-primary-border)] bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]">
          <QrCode className="h-9 w-9" strokeWidth={1.5} />
          <span className="mfa-scan-line absolute inset-x-1 top-2 h-0.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
        </div>

        <span className="mfa-transfer-dot absolute left-[43%] top-1/2 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />

        <div className="mfa-phone-float relative flex h-[76px] w-11 flex-col items-center rounded-[11px] border-2 border-[color:var(--color-primary-border)] bg-[var(--color-surface)] px-1 pt-2 shadow-[var(--shadow-sm)]">
          <span className="absolute top-1 h-0.5 w-2 rounded-full bg-[color:var(--color-primary-border)]" />
          <Smartphone
            className="h-4 w-4 text-[var(--color-primary)]"
            strokeWidth={1.7}
          />
          <span className="mt-1.5 h-1 w-6 rounded-full bg-[var(--color-primary-muted)]" />
          <span className="mt-1 h-1 w-4 rounded-full bg-[var(--color-primary-muted)]" />
          <span className="mt-2 h-1.5 w-6 rounded-sm bg-[var(--color-primary)]/20" />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {STORE_LINKS.map((store) => (
          <a
            key={store.label}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[color:var(--color-primary-border)] bg-[var(--color-surface)] px-2.5 text-eyebrow font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {store.label}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ))}
      </div>

      <style jsx>{`
        .mfa-scan-line {
          animation: mfa-scan 2.8s ease-in-out infinite;
        }

        .mfa-transfer-dot {
          animation: mfa-transfer 2.8s ease-in-out infinite;
        }

        .mfa-phone-float {
          animation: mfa-float 3.2s ease-in-out infinite;
        }

        @keyframes mfa-scan {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.45;
          }
          50% {
            transform: translateY(2.5rem);
            opacity: 1;
          }
        }

        @keyframes mfa-transfer {
          0%,
          100% {
            transform: translateX(-0.4rem);
            opacity: 0.35;
          }
          50% {
            transform: translateX(0.4rem);
            opacity: 1;
          }
        }

        @keyframes mfa-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-0.2rem);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mfa-scan-line,
          .mfa-transfer-dot,
          .mfa-phone-float {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
