// Shared style tokens for the public marketing homepage sections.
// Centralized here so the look of the whole page can be retuned from one
// place without hunting through every section component. Built on top of
// the app-wide CSS variables (--color-primary, etc.) defined in
// globals.css, so it stays consistent with the rest of the product and
// with dark/light theme switching.

export const marketingTheme = {
  section: {
    // Horizontal page gutter, consistent across every section.
    container: "mx-auto w-full max-w-6xl px-6 lg:px-8",
    // Vertical rhythm between stacked sections.
    spacingY: "py-16 sm:py-20",
  },
  card: {
    base: "rounded-2xl border border-slate-900/8 bg-white shadow-[var(--shadow-sm)]",
    muted: "rounded-2xl border border-slate-900/8 bg-slate-50",
    hover: "transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
  },
  iconBadge: {
    base: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
  },
  darkPanel: {
    base: "rounded-2xl bg-[#0f172a] text-white",
  },
  heading: {
    eyebrow: "text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-text-subtle",
    section: "text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl",
    sectionSubtitle: "mt-2 text-sm leading-relaxed text-slate-500 sm:text-base",
  },
  cta: {
    primary:
      "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]",
    secondary:
      "inline-flex items-center justify-center gap-2 rounded-full border border-slate-900/12 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:text-primary",
  },
} as const;
