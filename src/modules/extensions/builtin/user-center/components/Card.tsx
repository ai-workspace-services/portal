import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  'data-testid'?: string
}
export default function Card({ children, className = '', 'data-testid': testId }: CardProps) {
  return (
    <section
      data-testid={testId}
      className={`rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-sm)] backdrop-blur transition-colors ${className}`.trim()}
    >
      {children}
    </section>
  )
}
