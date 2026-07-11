"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import LanguageToggle from "@/components/LanguageToggle";
import { useUserStore } from "@lib/userStore";

export default function MarketingNav() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language];
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const logout = useUserStore((state) => state.logout);
  const isAuthenticated = Boolean(user);
  const accountInitial =
    user?.username?.charAt(0)?.toUpperCase() ??
    user?.email?.charAt(0)?.toUpperCase() ??
    "?";
  const accountLabel = user?.username ?? user?.email ?? "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setAccountOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setAccountOpen(false);
    setMobileOpen(false);
    await logout();
  }

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-40 border-b border-slate-900/8 bg-white/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-primary">
            {content.brand.name}
          </span>
          <span className="hidden text-xs font-medium text-slate-400 sm:inline">
            {content.brand.tagline}
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {content.nav.dropdowns.map((dropdown, index) => (
            <div
              key={dropdown.label}
              className="relative"
              onMouseEnter={() => setOpenDropdown(index)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                onClick={() =>
                  setOpenDropdown((current) => (current === index ? null : index))
                }
                aria-expanded={openDropdown === index}
              >
                {dropdown.label}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    openDropdown === index ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              {openDropdown === index && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="grid w-[560px] grid-cols-2 gap-1 rounded-2xl border border-slate-900/8 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                    {dropdown.columns.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="rounded-xl p-3 transition-colors hover:bg-slate-50"
                        onClick={() => setOpenDropdown(null)}
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {item.label}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {item.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {content.nav.links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageToggle />
          {isLoading ? (
            <div
              className="h-9 w-9 animate-pulse rounded-full bg-slate-100"
              aria-hidden
            />
          ) : isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-slate-900/10 py-1 pl-1 pr-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {accountInitial}
                </span>
                <span className="max-w-[10rem] truncate">{accountLabel}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full pt-2">
                  <div className="w-44 rounded-2xl border border-slate-900/8 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      {content.nav.logout}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-primary"
            >
              {content.nav.login}
            </Link>
          )}
          <Link
            href="/panel"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            {content.nav.enterConsole}
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-900/8 bg-white px-6 pb-6 pt-2 lg:hidden">
          {content.nav.dropdowns.map((dropdown) => (
            <div key={dropdown.label} className="py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {dropdown.label}
              </div>
              <div className="mt-1 space-y-1">
                {dropdown.columns.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {content.nav.links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block rounded-lg px-2 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated && !isLoading && (
            <div className="mt-3 flex items-center gap-3 border-t border-slate-900/8 pt-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {accountInitial}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {accountLabel}
              </span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 border-t border-slate-900/8 pt-4">
            {isLoading ? null : isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-900/12 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {content.nav.logout}
              </button>
            ) : (
              <Link
                href="/login"
                className="flex-1 rounded-full border border-slate-900/12 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                {content.nav.login}
              </Link>
            )}
            <Link
              href="/panel"
              className="flex-1 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {content.nav.enterConsole}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
