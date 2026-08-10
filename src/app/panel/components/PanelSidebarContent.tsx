"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ComponentType } from "react";

import { Plus, type LucideIcon } from "lucide-react";

import { getExtensionRegistry } from "@extensions/loader";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { resolveAccess } from "@lib/accessControl";
import { useUserStore } from "@lib/userStore";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "../../../components/layout/SidebarRoot";

const registry = getExtensionRegistry();
const PlaceholderIcon: ComponentType<{ className?: string }> = () => null;

interface NavItem {
  id?: string;
  href: string;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string }> | LucideIcon;
  disabled: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

function isActive(pathname: string, href: string) {
  if (href === "/panel") {
    return pathname === "/panel";
  }
  return pathname.startsWith(href);
}

export interface PanelSidebarContentProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function PanelSidebarContent({
  onNavigate,
  collapsed = false,
}: PanelSidebarContentProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const copy = translations[language].userCenter.mfa;
  const user = useUserStore((state) => state.user);
  const requiresSetup = Boolean(
    user && !user.isReadOnly && (!user.mfaEnabled || user.mfaPending),
  );

  const navSections = useMemo<NavSection[]>(() => {
    return registry.sidebar
      .map((section) => {
        const items = section.items
          .map((item) => {
            const { route } = item;
            const guardResult = route.guard
              ? resolveAccess(user, route.guard)
              : { allowed: true };
            const requiresRole = Boolean(route.guard?.roles?.length);
            if (requiresRole && !guardResult.allowed) {
              return null;
            }

            const disabledByGuard = !requiresRole && !guardResult.allowed;
            const disabled =
              item.disabled ||
              disabledByGuard ||
              (requiresSetup && route.path !== "/panel/account");

            const Icon = route.icon ?? PlaceholderIcon;

            return {
              id: route.id,
              href: route.path,
              label: route.label,
              description: route.description ?? "",
              Icon,
              disabled,
            };
          })
          .filter((value) => Boolean(value)) as NavItem[];

        if (items.length === 0) {
          return null;
        }

        return {
          id: section.id,
          title: section.title,
          items,
        };
      })
      .filter((value) => Boolean(value)) as NavSection[];
  }, [requiresSetup, user]);

  const primarySections = navSections.filter(
    (section) => section.id !== "infra",
  );
  const resourceSections = navSections.filter(
    (section) => section.id === "infra",
  );

  const renderSection = (section: NavSection) => {
    const sectionDisabled = section.items.every((item) => item.disabled);

    return (
      <div key={section.id} className="space-y-3">
        <p
          className={`text-xs font-semibold uppercase tracking-wide transition-all duration-300 ${
            sectionDisabled
              ? "text-[var(--color-text-subtle)] opacity-60"
              : "text-[var(--color-text-subtle)]"
          } ${collapsed ? "text-center scale-0 h-0 opacity-0 invisible" : "text-left"}`}
        >
          {translations[language].userCenter.sections[
            section.id as keyof typeof translations.en.userCenter.sections
          ] || section.title}
        </p>
        <div className={`space-y-2 ${sectionDisabled ? "opacity-60" : ""}`}>
          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            const isDashboard = item.href === "/panel";
            const { Icon } = item;

            const baseClasses = [
              "group flex items-center gap-3 rounded-[14px] border px-3 py-3 text-sm transition-all duration-300",
            ];
            if (item.disabled) {
              baseClasses.push(
                "cursor-not-allowed border-dashed border-[color:var(--color-surface-border)] text-[var(--color-text-subtle)] opacity-60",
              );
            } else {
              baseClasses.push(
                "border-transparent text-[var(--color-text-subtle)] hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)]",
              );
            }

            if (active) {
              baseClasses.push(
                "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]",
              );
            } else if (isDashboard) {
              // Dashboard visual priority when not active
              baseClasses.push(
                "bg-[var(--color-surface-muted)]/45 shadow-[var(--shadow-soft)]",
              );
            }

            const iconClasses = [
              "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
            ];
            if (active) {
              iconClasses.push(
                "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
              );
            } else if (item.disabled) {
              iconClasses.push(
                "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)] opacity-60",
              );
            } else if (isDashboard) {
              iconClasses.push(
                "bg-[var(--color-primary-muted)] text-[var(--color-primary)]",
              );
            } else {
              iconClasses.push(
                "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)] group-hover:bg-[var(--color-primary-muted)] group-hover:text-[var(--color-primary)]",
              );
            }

            const descriptionClasses = [
              "text-xs transition-colors",
              item.disabled
                ? "text-[var(--color-text-subtle)] opacity-60"
                : "text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)]",
            ];

            const content = (
              <div
                className={baseClasses.join(" ")}
                title={collapsed ? item.label : undefined}
              >
                <span className={`${iconClasses.join(" ")} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={`flex flex-1 flex-col truncate transition-all duration-300 ${collapsed ? "w-0 opacity-0 invisible overflow-hidden" : "w-auto opacity-100 visible"}`}
                >
                  <span className="font-semibold text-left">
                    {(item.id &&
                      translations[language].userCenter.items[
                        item.id as keyof typeof translations.en.userCenter.items
                      ]) ||
                      item.label}
                  </span>
                  <span
                    className={`${descriptionClasses.join(" ")} text-left`}
                  >
                    {item.description}
                  </span>
                </span>
              </div>
            );

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  aria-disabled={true}
                  className="select-none"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <SidebarHeader
        className={`space-y-1 text-[var(--color-text)] transition-all duration-300 mb-6 ${collapsed ? "text-center" : "text-left"}`}
      >
        <h2
          className={`text-lg font-bold text-[var(--color-heading)] truncate transition-opacity duration-300 ${collapsed ? "opacity-0 h-0 invisible" : "opacity-100"}`}
        >
          {translations[language].userCenter.overview.heading}
        </h2>
        <p
          className={`text-sm text-[var(--color-text-subtle)] truncate transition-opacity duration-300 ${collapsed ? "opacity-0 h-0 invisible" : "opacity-100"}`}
        >
          {language === "zh"
            ? "在同一处掌控权限与功能特性。"
            : "Manage permissions and features in one place."}
        </p>

        {requiresSetup ? (
          <div className="mt-4 rounded-[14px] border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/92 p-3 text-xs text-[var(--color-warning-foreground)] shadow-[var(--shadow-soft)] transition-colors">
            <p className="font-semibold">{copy.pendingHint}</p>
            <p className="mt-1">{copy.lockedMessage}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/panel/account?setupMfa=1"
                onClick={onNavigate}
                className="tactile-button tactile-button-primary min-h-9 px-3 text-xs"
              >
                {copy.actions.setup}
              </Link>
              <a
                href={copy.actions.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="tactile-button tactile-button-soft min-h-9 border border-[color:var(--color-primary-border)] px-3 text-xs text-[var(--color-primary)]"
              >
                {copy.actions.docs}
              </a>
            </div>
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-6">
        {primarySections.map(renderSection)}
      </SidebarContent>

      <SidebarFooter className="border-t border-[color:var(--color-surface-border)] px-1 pb-3 pt-3">
        {resourceSections.length > 0 ? (
          <div className="mb-4 border-b border-[color:var(--color-surface-border)] pb-4">
            {resourceSections.map(renderSection)}
          </div>
        ) : null}
        <button
          className={`tactile-button tactile-button-primary group w-full gap-2 px-3 text-sm font-bold ${collapsed ? "px-0" : ""}`}
          title={
            collapsed
              ? language === "zh"
                ? "创建项目"
                : "New Project"
              : undefined
          }
        >
          <Plus
            className={`size-5 transition-transform group-hover:rotate-90`}
          />
          <span
            className={`transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}
          >
            {language === "zh" ? "创建项目" : "New Project"}
          </span>
        </button>
      </SidebarFooter>
    </>
  );
}
