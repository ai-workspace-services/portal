import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { cn } from "@/lib/utils";

type PublicPageShellProps = {
  children: React.ReactNode;
  mainClassName?: string;
  containerClassName?: string;
};

type PublicPageIntroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  className?: string;
};

export function PublicPageShell({
  children,
  mainClassName,
  containerClassName,
}: PublicPageShellProps) {
  return (
    <div className="relative min-h-screen bg-background text-text transition-colors duration-150">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0))]"
      />
      <div className="relative">
        <MarketingNav />
        <div
          className={cn(
            "mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16",
            containerClassName,
          )}
        >
          <main
            className={cn(
              "space-y-6 pt-4 sm:space-y-8 sm:pt-6",
              mainClassName,
            )}
          >
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export function PublicPageIntro({
  eyebrow,
  title,
  subtitle,
  titleClassName,
  className,
}: PublicPageIntroProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-subtle">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.035em] text-heading sm:text-4xl",
          titleClassName,
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="max-w-3xl text-body leading-7 text-text-muted sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
