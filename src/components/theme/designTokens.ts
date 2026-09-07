export type PageVariant = 'homepage' | 'product'

type ButtonVariant = 'primary' | 'secondary'

export const designTokens = {
  colors: {
    primary: 'text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-[var(--color-primary)]',
    accent: 'text-[var(--color-primary)]',
    accentHover: 'text-[var(--color-primary-hover)]',
    textPrimary: 'text-[var(--color-text)]',
    textSecondary: 'text-[var(--color-text-muted)]',
    textMuted: 'text-[var(--color-text-subtle)]',
    border: 'border-[color:var(--color-surface-border)]',
    surface: 'bg-white',
    surfaceAlt: 'bg-[var(--color-surface-muted)]',
    background: 'bg-[var(--color-background)]',
    gradient: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(242,245,248,0.86))]',
  },
  layout: {
    container: 'max-w-7xl mx-auto px-6 md:px-10',
  },
  spacing: {
    section: {
      homepage: 'py-16 md:py-20',
      product: 'py-16',
    } satisfies Record<PageVariant, string>,
  },
  hero: {
    heights: {
      homepage: 'min-h-[90vh]',
      product: 'min-h-[60vh]',
    } satisfies Record<PageVariant, string>,
    background: {
      homepage:
        'bg-[linear-gradient(160deg,rgba(242,245,248,0.94),rgba(255,255,255,0.92),rgba(232,240,251,0.72))]',
      product:
        'bg-[linear-gradient(180deg,rgba(242,245,248,0.92),rgba(255,255,255,0.96))]',
    } satisfies Record<PageVariant, string>,
  },
  effects: {
    radii: {
      sm: 'rounded-[6px]',
      md: 'rounded-[8px]',
      xl: 'rounded-[8px]',
    },
    shadows: {
      soft: 'shadow-[var(--shadow-soft)]',
    },
  },
  transitions: {
    homepage: 'transition duration-700',
    product: 'transition duration-300',
  } satisfies Record<PageVariant, string>,
  cards: {
    base: 'border border-[color:var(--color-surface-border)] rounded-[6px] md:rounded-[8px] transition duration-200 bg-white/94 shadow-[var(--shadow-soft)]',
  },
  buttons: {
    base: 'inline-flex items-center justify-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]',
    palette: {
      primary:
        'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
      secondary:
        'border border-[color:var(--color-surface-border)] bg-white/88 text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]',
    } satisfies Record<ButtonVariant, string>,
    shape: {
      homepage: 'rounded-[8px] px-5 py-2.5 text-caption',
      product: 'rounded-[8px] px-4 py-2 text-caption',
    } satisfies Record<PageVariant, string>,
  },
}

export type { ButtonVariant }
