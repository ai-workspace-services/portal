"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import LanguageToggle from "@/components/LanguageToggle";

export default function MarketingNav() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language];
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
                  <div className="grid w-[560px] grid-cols-2 gap-1 rounded-2xl border border-slate-900/8 bg-white p-3 shadow-lg">
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
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-primary"
          >
            {content.nav.login}
          </Link>
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
          <div className="mt-3 flex items-center gap-3 border-t border-slate-900/8 pt-4">
            <Link
              href="/login"
              className="flex-1 rounded-full border border-slate-900/12 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
            >
              {content.nav.login}
            </Link>
            <Link
              href="/panel"
              className="flex-1 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
              {content.nav.enterConsole}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
