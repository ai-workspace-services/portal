"use client";

/**
 * 站点导航 —— 全站公开页唯一一套导航。
 *
 * 由原 MarketingNav（Tailwind + marketingTheme）与 XdsSiteNav（xds 外观）合并而来：
 * 信息架构、登录态、控制台角色切换沿用首页导航，外观改用 xds 设计系统。
 *
 * 作用域策略：.xds 只挂在导航自身（和面包屑）上，不往页面根节点扩散，
 * 避免 .xds 的 :where() 基线重置反噬到页面正文里的 Tailwind 排版。
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Github, LogOut, Menu, Star, X } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import LanguageToggle from "@/components/LanguageToggle";
import MarketingBreadcrumbs from "@/components/marketing/MarketingBreadcrumbs";
import { useUserStore } from "@lib/userStore";
import { cn } from "@/lib/utils";

type NavFlatLink = { label: string; href: string };

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

/**
 * 平铺导航项。站外链接走原生 a 并补 noopener；仓库链接额外做成星标胶囊，
 * 是导航里唯一带 star 暗示的入口——图标 hover 才点亮，不喧宾夺主。
 */
function NavLink({
  link,
  onNavigate,
}: {
  link: NavFlatLink;
  onNavigate?: () => void;
}) {
  const external = isExternal(link.href);
  // 站内 /github 是跳转到开源仓库的入口，和直挂外链一样按仓库样式渲染。
  const isRepo = external
    ? /(^|\.)github\.com$/i.test(new URL(link.href).host)
    : link.href === "/github";

  if (isRepo) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="xds-mnav-repo"
        title="欢迎 Star"
        onClick={onNavigate}
      >
        <Github className="h-3.5 w-3.5" aria-hidden="true" />
        {link.label}
        <Star className="h-3 w-3 xds-mnav-star" aria-hidden="true" />
      </a>
    );
  }

  if (external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

export default function MarketingNav() {
  const { language } = useLanguage();
  const content = homeMarketingContent[language] ?? homeMarketingContent.zh;
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  // 触发器与下拉面板之间有 6px 空隙，鼠标斜着划过去时会先掠过空隙。
  // CSS 用 ::before 把空隙并进面板命中区，这里再给一个关闭延时兜底，
  // 避免指针路过相邻触发器或轻微抖动就把菜单收掉。
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelScheduledClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelScheduledClose();
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 200);
  }

  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const logout = useUserStore((state) => state.logout);
  const isAuthenticated = Boolean(user);
  const accountInitial =
    user?.username?.charAt(0)?.toUpperCase() ??
    user?.email?.charAt(0)?.toUpperCase() ??
    "?";
  const accountLabel = user?.username ?? user?.email ?? "";

  const [activeConsole, setActiveConsole] = useState<
    "user" | "admin" | "operator"
  >("user");

  useEffect(() => {
    if (user?.isAdmin) {
      setActiveConsole("admin");
    } else if (user?.isOperator) {
      setActiveConsole("operator");
    } else {
      setActiveConsole("user");
    }
  }, [user]);

  const showRoleSelector =
    isAuthenticated && (user?.isAdmin || user?.isOperator);

  const displayLabel = showRoleSelector
    ? activeConsole === "admin"
      ? "Admin"
      : activeConsole === "operator"
        ? "Operator"
        : "用户中心"
    : accountLabel;

  const consoleHref = showRoleSelector
    ? activeConsole === "admin" || activeConsole === "operator"
      ? "/panel/management"
      : "/panel"
    : "/panel";

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
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  async function handleLogout() {
    setAccountOpen(false);
    setMobileOpen(false);
    await logout();
  }

  return (
    <header className="xds xds-mnav" ref={navRef}>
      <div className="xds-container-wide xds-mnav-inner">
        <div className="xds-mnav-wayfind">
          <MarketingBreadcrumbs />
        </div>

        <nav className="xds-mnav-links xds-mnav-desktop">
          {content.nav.dropdowns.map((dropdown, index) => (
            <div
              key={dropdown.label}
              className="xds-mnav-item"
              onMouseEnter={() => {
                cancelScheduledClose();
                setOpenDropdown(index);
              }}
              onMouseLeave={scheduleClose}
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
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 xds-mnav-caret",
                    openDropdown === index && "xds-is-open",
                  )}
                  aria-hidden="true"
                />
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
            <NavLink key={link.href + link.label} link={link} />
          ))}
        </nav>

        <div
          className="xds-row xds-mnav-actions xds-mnav-desktop"
          style={{ gap: "var(--sp-3)" }}
        >
          <LanguageToggle />

          {isLoading ? (
            <span className="xds-mnav-skeleton" aria-hidden="true" />
          ) : isAuthenticated ? (
            <>
              <div className="xds-mnav-item">
                <button
                  type="button"
                  className="xds-mnav-account"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((open) => !open)}
                >
                  <span className="xds-mnav-avatar">{accountInitial}</span>
                  <span className="xds-mnav-account-label">{displayLabel}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 xds-mnav-caret",
                      accountOpen && "xds-is-open",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {accountOpen ? (
                  <div className="xds-mnav-menu xds-mnav-menu-sm">
                    {showRoleSelector ? (
                      <div className="xds-mnav-menu-section">
                        <span className="xds-mnav-menu-section-label">
                          切换控制台
                        </span>
                        {user?.isAdmin ? (
                          <button
                            type="button"
                            className={cn(
                              "xds-mnav-menu-item",
                              activeConsole === "admin" && "xds-is-active",
                            )}
                            onClick={() => {
                              setActiveConsole("admin");
                              setAccountOpen(false);
                            }}
                          >
                            <span className="xds-mnav-menu-label">
                              Admin 管理面
                            </span>
                          </button>
                        ) : null}
                        {user?.isOperator ? (
                          <button
                            type="button"
                            className={cn(
                              "xds-mnav-menu-item",
                              activeConsole === "operator" && "xds-is-active",
                            )}
                            onClick={() => {
                              setActiveConsole("operator");
                              setAccountOpen(false);
                            }}
                          >
                            <span className="xds-mnav-menu-label">
                              Operator 运营面
                            </span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={cn(
                            "xds-mnav-menu-item",
                            activeConsole === "user" && "xds-is-active",
                          )}
                          onClick={() => {
                            setActiveConsole("user");
                            setAccountOpen(false);
                          }}
                        >
                          <span className="xds-mnav-menu-label">用户中心</span>
                        </button>
                      </div>
                    ) : null}
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

              <Link
                href={consoleHref}
                className="xds-btn xds-btn-primary xds-btn-sm"
              >
                {content.nav.enterConsole}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="xds-btn xds-btn-ghost xds-btn-sm">
                {content.nav.login}
              </Link>
              <Link
                href={content.hero.primaryCta.href}
                className="xds-btn xds-btn-primary xds-btn-sm"
              >
                {content.hero.primaryCta.label}
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
            {content.nav.dropdowns.map((dropdown) => (
              <div key={dropdown.label} className="xds-mnav-mobile-group">
                <span className="xds-mnav-group-label">{dropdown.label}</span>
                {dropdown.columns.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}

            <div className="xds-mnav-mobile-group">
              {content.nav.links.map((link) => (
                <NavLink
                  key={link.href + link.label}
                  link={link}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>

            {isAuthenticated && !isLoading ? (
              <div className="xds-row xds-mnav-mobile-account">
                <span className="xds-mnav-avatar">{accountInitial}</span>
                <span className="xds-mnav-account-label">{accountLabel}</span>
              </div>
            ) : null}

            <div className="xds-row xds-mnav-mobile-actions">
              <LanguageToggle />
              {isLoading ? null : isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="xds-btn xds-btn-secondary xds-btn-sm"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    {content.nav.logout}
                  </button>
                  <Link
                    href={consoleHref}
                    className="xds-btn xds-btn-primary xds-btn-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    {content.nav.enterConsole}
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="xds-btn xds-btn-primary xds-btn-sm"
                  onClick={() => setMobileOpen(false)}
                >
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
