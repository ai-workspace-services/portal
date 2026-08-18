"use client";

import clsx from "clsx";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

type SwitchAction = {
  text: string;
  linkLabel: string;
  href: string;
};

export type AuthLayoutSocialButton = {
  label: string;
  href: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type AlertType = "error" | "success" | "info";

type AuthLayoutProps = {
  mode: "login" | "register";
  badge?: string;
  title: string;
  description?: string;
  alert?: { type: AlertType; message: string } | null;
  socialHeading?: string;
  socialButtons?: AuthLayoutSocialButton[];
  aboveForm?: ReactNode;
  children: ReactNode;
  footnote?: ReactNode;
  bottomNote?: string;
  switchAction: SwitchAction;
};

export const AUTH_INPUT_CLASS =
  "tactile-control w-full rounded-[12px] px-4 py-3 text-slate-900 transition focus:border-slate-900/15 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export const AUTH_HINT_PANEL_CLASS =
  "rounded-[14px] border border-slate-900/8 bg-white/82 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[var(--shadow-soft)]";

export const AUTH_PRIMARY_BUTTON_CLASS =
  "tactile-button tactile-button-primary inline-flex px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70";

export const AUTH_SECONDARY_BUTTON_CLASS =
  "tactile-button tactile-button-soft inline-flex px-4 py-3 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

export const AUTH_TEXT_LINK_CLASS =
  "font-semibold text-primary transition hover:text-primary-hover";

export const AUTH_CHECKBOX_CLASS =
  "h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30";

export const AUTH_CODE_INPUT_CLASS =
  "tactile-control h-12 w-full rounded-[12px] text-center text-lg font-semibold text-slate-900 transition focus:border-slate-900/15 focus:outline-none focus:ring-2 focus:ring-primary/15";

function AuthLayoutTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex min-h-10 items-center justify-center rounded-[12px] px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-white text-slate-900 shadow-[var(--shadow-soft)]"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function AuthSocialButton({
  label,
  href,
  icon,
  disabled,
  onClick,
}: AuthLayoutSocialButton) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
    }
    onClick?.(event);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-3 rounded-[12px] px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        disabled
          ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 focus-visible:outline-slate-200"
          : "border border-slate-900/8 bg-white text-slate-800 shadow-[var(--shadow-soft)] hover:bg-[#fcfbf8] focus-visible:outline-slate-300",
      )}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
    >
      {icon}
      {label}
    </a>
  );
}

export function AuthLayout({
  mode,
  badge,
  title,
  description,
  alert,
  socialHeading,
  socialButtons = [],
  aboveForm,
  children,
  footnote,
  bottomNote,
  switchAction,
}: AuthLayoutProps) {
  const modeLabel = mode === "login" ? "Account access" : "Create account";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-text transition-colors duration-150">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(37,78,219,0.08),transparent_36%),radial-gradient(circle_at_top_right,rgba(245,211,170,0.32),transparent_38%)]"
      />

      <main
        className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
        data-testid="auth-layout"
      >
        <div className="w-full max-w-[32rem]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link href="/" className="space-y-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
                XWork Tech Toolkit
              </p>
              <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                Svc.Plus
              </p>
            </Link>
            <span className="rounded-[12px] border border-slate-900/8 bg-white/88 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {modeLabel}
            </span>
          </div>

          <div className="overflow-hidden rounded-[1rem] border border-slate-900/8 bg-white/92 p-5 shadow-[var(--shadow-soft)] backdrop-blur sm:p-6">
            <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-surface-muted/70 p-1">
              <AuthLayoutTab href="/login" active={mode === "login"}>
                Sign In
              </AuthLayoutTab>
              <AuthLayoutTab href="/register" active={mode === "register"}>
                Sign Up
              </AuthLayoutTab>
            </div>

            <div className="mt-6 space-y-6">
              {badge ? (
                <span className="inline-flex items-center rounded-[12px] border border-slate-900/8 bg-white/84 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {badge}
                </span>
              ) : null}

              <div className="space-y-2">
                <h1 className="text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-slate-900 sm:text-[2.5rem]">
                  {title}
                </h1>
                {description ? (
                  <p className="text-sm leading-7 text-slate-600">
                    {description}
                  </p>
                ) : null}
              </div>

              {alert ? (
                <div
                  className={clsx(
                    "rounded-[14px] border px-4 py-3 text-sm leading-6 shadow-[var(--shadow-soft)]",
                    alert.type === "error"
                      ? "border-danger/20 bg-danger-muted text-danger-foreground"
                      : alert.type === "success"
                        ? "border-success/20 bg-success-muted text-success-foreground"
                        : "border-primary/15 bg-primary-muted text-accent-foreground",
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {alert.message}
                </div>
              ) : null}

              {aboveForm}

              <div className="space-y-5">{children}</div>

              {socialButtons.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" aria-hidden />
                    {socialHeading ?? "Or continue with"}
                    <span className="h-px flex-1 bg-slate-200" aria-hidden />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {socialButtons.map((button) => (
                      <AuthSocialButton key={button.label} {...button} />
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="text-sm text-slate-600">
                {switchAction.text}{" "}
                <Link href={switchAction.href} className={AUTH_TEXT_LINK_CLASS}>
                  {switchAction.linkLabel}
                </Link>
              </p>

              {footnote ? (
                <div className="text-xs leading-6 text-text-subtle">
                  {footnote}
                </div>
              ) : null}
            </div>
          </div>

          {bottomNote ? (
            <p className="mt-6 text-center text-xs text-text-subtle">
              {bottomNote}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
