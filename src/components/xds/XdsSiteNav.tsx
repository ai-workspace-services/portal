"use client";

/**
 * 站点导航（xds 版）—— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 产品页专用：与 MarketingNav 共用同一份导航内容（homeMarketingContent.nav）
 * 和同一个登录态（userStore），只把外观换成 xds，避免产品页出现
 * Tailwind / marketingTheme 与 xds 混排。
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, X, Zap } from "lucide-react";

import LanguageToggle from "@/components/LanguageToggle";
import { homeMarketingContent } from "@/components/marketing/content";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useUserStore } from "@lib/userStore";

export default function XdsSiteNav() {
  const { language } = useLanguage();
  const content =
    homeMarketingContent[language] ?? homeMarketingContent.zh;

  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const logout = useUserStore((state) => state.logout);
  const isAuthenticated = Boolean(user);
  const accountLabel = user?.username ?? user?.email ?? "";
  const accountInitial =
    user?.username?.charAt(0)?.toUpperCase() ??
    user?.email?.charAt(0)?.toUpperCase() ??
    "?";

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
        setAccountOpen(false);
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

  async function handleLogout() {
    setAccountOpen(false);
    setMobileOpen(false);
    await logout();
  }

  const flatLinks = [
    ...content.nav.dropdowns.flatMap((dropdown) => dropdown.columns),
    ...content.nav.links,
  ];

  return (
    <header className="xds-mnav" ref={navRef}>
      <div className="xds-container-wide xds-mnav-inner">
        <div className="xds-row" style={{ gap: "var(--sp-8)" }}>
          <Link className="xds-logo" href="/">
            <span className="xds-logo-mark">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            {content.brand.title}
          </Link>

          <nav className="xds-mnav-links xds-mnav-desktop">
            {content.nav.dropdowns.map((dropdown, index) => (
              <div
                key={dropdown.label}
                className="xds-mnav-item"
                onMouseEnter={() => setOpenDropdown(index)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  type="button"
                  className="xds-mnav-trigger"
                  aria-expanded={openDropdown === index}
                  onClick={() =>
                    setOpenDropdown((current) =>
                      current === index ? null : index,
                    )
                  }
                >
                  {dropdown.label}
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                {openDropdown === index ? (
                  <div className="xds-mnav-menu">
                    {dropdown.columns.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        className="xds-mnav-menu-item"
                        onClick={() => setOpenDropdown(null)}
                      >
                        <span className="xds-mnav-menu-label">{item.label}</span>
                        <span className="xds-t-caption">{item.description}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {content.nav.links.map((link) => (
              <Link key={link.href + link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="xds-row xds-mnav-desktop" style={{ gap: "var(--sp-3)" }}>
          <LanguageToggle />

          {isLoading ? (
            <span className="xds-mnav-skeleton" aria-hidden="true" />
          ) : isAuthenticated ? (
            <div className="xds-mnav-item">
              <button
                type="button"
                className="xds-mnav-account"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span className="xds-mnav-avatar">{accountInitial}</span>
                <span className="xds-mnav-account-label">{accountLabel}</span>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {accountOpen ? (
                <div className="xds-mnav-menu xds-mnav-menu-sm">
                  <Link
                    href="/panel"
                    className="xds-mnav-menu-item"
                    onClick={() => setAccountOpen(false)}
                  >
                    <span className="xds-mnav-menu-label">
                      {content.nav.enterConsole}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="xds-mnav-menu-item"
                    onClick={handleLogout}
                  >
                    <span className="xds-mnav-menu-label">
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      {content.nav.logout}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link href="/login" className="xds-btn xds-btn-ghost xds-btn-sm">
                {content.nav.login}
              </Link>
              <Link
                href="/register"
                className="xds-btn xds-btn-primary xds-btn-sm"
              >
                {content.nav.enterConsole}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="xds-mnav-burger"
          aria-label="menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <div className="xds-mnav-mobile">
          <div className="xds-container-wide">
            {flatLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="xds-row" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-4)" }}>
              <LanguageToggle />
              {isAuthenticated ? (
                <button
                  type="button"
                  className="xds-btn xds-btn-secondary xds-btn-sm"
                  onClick={handleLogout}
                >
                  {content.nav.logout}
                </button>
              ) : (
                <Link href="/login" className="xds-btn xds-btn-primary xds-btn-sm">
                  {content.nav.login}
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
