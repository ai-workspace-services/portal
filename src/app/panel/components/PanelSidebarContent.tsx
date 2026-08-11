"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ComponentType } from "react";

import { ChevronDown, Plus, Settings2, type LucideIcon } from "lucide-react";

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
  const user = useUserStore((state) => state.user);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
            const disabled = item.disabled || disabledByGuard;

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
  }, [user]);

  const primarySections = navSections.filter(
    (section) => section.id !== "infra",
  );
  const resourceSections = navSections.filter(
    (section) => section.id === "infra",
  );
  const advancedLabel =
    language === "zh" ? "用户高级配置选型" : "Advanced configuration";
  const advancedDescription =
    language === "zh"
      ? "部署、资源、密钥与可观测性"
      : "Deployments, resources, keys, and observability";

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
                  <span className={`${descriptionClasses.join(" ")} text-left`}>
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
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-6">
        {primarySections.map(renderSection)}
        {resourceSections.length > 0 ? (
          <div className="border-t border-[color:var(--color-surface-border)] pt-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
              aria-controls="advanced-configuration"
              title={collapsed ? advancedLabel : undefined}
              className={`group flex w-full items-center gap-3 rounded-[14px] border border-transparent px-3 py-3 text-left text-sm text-[var(--color-text-subtle)] transition-all duration-300 hover:border-[color:var(--color-primary-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] ${collapsed ? "justify-center px-0" : ""}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)] transition-colors group-hover:bg-[var(--color-primary-muted)] group-hover:text-[var(--color-primary)]">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span
                className={`min-w-0 flex-1 transition-all duration-300 ${collapsed ? "w-0 overflow-hidden opacity-0 invisible" : "w-auto opacity-100 visible"}`}
              >
                <span className="block font-semibold">{advancedLabel}</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--color-text-subtle)]">
                  {advancedDescription}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""} ${collapsed ? "hidden" : ""}`}
                aria-hidden="true"
              />
            </button>
            {advancedOpen ? (
              <div id="advanced-configuration" className="mt-3 space-y-5">
                {resourceSections.map(renderSection)}
              </div>
            ) : null}
          </div>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-[color:var(--color-surface-border)] px-1 pb-3 pt-3">
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
