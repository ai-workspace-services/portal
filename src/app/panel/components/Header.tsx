"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

import { hasPublicUserEmail } from "@lib/publicUserIdentity";
import { useUserStore } from "@lib/userStore";
import type { UserRole } from "@lib/userStore";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import LanguageToggle from "@components/LanguageToggle";

const ROLE_BADGES: Record<UserRole, { label: string; className: string }> = {
  user: {
    label: "User",
    className:
      "bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]",
  },
  operator: {
    label: "Operator",
    className:
      "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]",
  },
  admin: {
    label: "Admin",
    className: "bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
  },
};

interface HeaderProps {
  onMenu: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
}

function resolveAccountInitial(input?: string | null) {
  if (!input) {
    return "?";
  }

  const normalized = input.trim();
  if (!normalized) {
    return "?";
  }

  return normalized.charAt(0).toUpperCase();
}

export default function Header({
  onMenu,
  onCollapse,
  isCollapsed,
}: HeaderProps) {
  const { language } = useLanguage();
  const navCopy = translations[language].nav.account;
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const role: UserRole = user?.role ?? "user";
  const badge = ROLE_BADGES[role];
  const shouldRenderPublicEmail = hasPublicUserEmail({
    email: user?.email,
    role,
  });
  const accountLabel =
    user?.name ??
    user?.username ??
    (shouldRenderPublicEmail ? user?.email : undefined) ??
    navCopy.title;
  const accountInitial = resolveAccountInitial(accountLabel);
  const statusBadge = isLoading
    ? language === "zh" ? "同步中" : "Syncing"
    : language === "zh"
      ? ({ user: "用户", operator: "运营", admin: "管理员" }[role] ?? badge.label)
      : badge.label;
  const badgeClasses = isLoading
    ? "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)] opacity-70"
    : badge.className;

  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--shadow-soft)] backdrop-blur-xl transition-colors">
      <div className="flex items-center justify-between px-4 py-2.5 md:px-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="tactile-button tactile-button-soft gap-2 px-3 text-[13px] font-medium text-[var(--color-text-subtle)] md:hidden"
            onClick={onMenu}
            aria-label={language === "zh" ? "切换导航菜单" : "Toggle navigation menu"}
          >
            <Menu className="h-4 w-4" />
            {language === "zh" ? "菜单" : "Menu"}
          </button>

          {onCollapse && (
            <button
              type="button"
              className="tactile-button tactile-button-soft hidden h-8 w-8 items-center justify-center p-0 text-[var(--color-text-subtle)] md:flex"
              onClick={onCollapse}
            aria-label={isCollapsed
              ? (language === "zh" ? "展开侧边栏" : "Expand sidebar")
              : (language === "zh" ? "收起侧边栏" : "Collapse sidebar")}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 md:justify-end">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="tactile-button tactile-button-soft gap-2 px-3 text-[13px] font-medium text-[var(--color-text-subtle)]"
            >
              {language === "zh" ? "返回主页" : "Back to homepage"}
            </Link>
            <LanguageToggle />
            <span
              className={`rounded-[999px] px-3 py-1.5 text-xs font-semibold ${badgeClasses}`}
            >
              {statusBadge}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-[var(--gradient-primary-from)] to-[var(--gradient-primary-to)] text-[13px] font-semibold text-[var(--color-primary-foreground)] shadow-[var(--shadow-soft)] transition-colors">
              {isLoading ? (
                <span className="animate-pulse">…</span>
              ) : (
                accountInitial
              )}
            </div>
            <div className="hidden flex-col text-right text-xs text-[var(--color-text-subtle)] transition-colors sm:flex">
              <span className="text-[13px] font-semibold text-[var(--color-text)]">
                {accountLabel}
              </span>
              {shouldRenderPublicEmail ? <span>{user?.email}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
