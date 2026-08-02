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
    <section id={id} aria-labelledby={`${id}-title`} className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
          <h2
            id={`${id}-title`}
            className="mt-1 text-xl font-semibold text-[var(--color-heading)] sm:text-2xl"
          >
            {title}
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-subtle)]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
