import type { ReactNode } from "react";

interface AccountSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export default function AccountSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: AccountSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="space-y-2">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
          <h2
            id={`${id}-title`}
            className="mt-0.5 text-lg font-semibold text-[var(--color-heading)] sm:text-xl"
          >
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-[var(--color-text-subtle)] sm:text-sm">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
