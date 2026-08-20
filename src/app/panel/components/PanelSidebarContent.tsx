"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ComponentType } from "react";

import { ChevronDown, Plus, Settings2, Zap, type LucideIcon } from "lucide-react";

import { getExtensionRegistry } from "@extensions/loader";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { resolveAccess } from "@lib/accessControl";
import { cn } from "@lib/utils";
import { useUserStore } from "@lib/userStore";

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

/**
 * /panel 左侧导航 —— 结构由扩展注册表驱动（section/order/guard/featureFlag
 * 全部来自 modules/extensions/builtin/*），这里只负责渲染。视觉迁移自
 * design-system/02-user-center.html：单行 nav-item（图标 + 标签，描述文字
 * 收进 title 提示），.xds-nav-* 系列类见 app/xds.css 的 Console shell 分区。
 */
export function PanelSidebarContent({
  onNavigate,
  collapsed = false,
}: PanelSidebarContentProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const user = useUserStore((state) => state.user);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const copy = translations[language].userCenter;

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

  const sectionLabel = (section: NavSection) =>
    copy.sections[section.id as keyof typeof copy.sections] || section.title;

  const itemLabel = (item: NavItem) =>
    (item.id &&
      copy.items[item.id as keyof typeof copy.items]) ||
    item.label;

  const renderItem = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    const label = itemLabel(item);
    const tooltip = item.description ? `${label} · ${item.description}` : label;

    const inner = (
      <>
        <item.Icon className="xds-ico" aria-hidden="true" />
        <span className="xds-nav-item-label truncate">{label}</span>
      </>
    );

    if (item.disabled) {
      return (
        <div
          key={item.href}
          className="xds-nav-item xds-is-disabled select-none"
          title={tooltip}
          aria-disabled="true"
        >
          {inner}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={tooltip}
        className={cn("xds-nav-item", active && "xds-is-active")}
      >
        {inner}
      </Link>
    );
  };

  const renderSection = (section: NavSection) => (
    <div key={section.id} className="xds-nav-group">
      <div className="xds-nav-label">{sectionLabel(section)}</div>
      {section.items.map(renderItem)}
    </div>
  );

  return (
    <>
      <a
        href="/"
        className="xds-sidebar-brand block hover:opacity-85 transition-opacity"
        title={language === "zh" ? "返回主页" : "Back to homepage"}
      >
        <span className="xds-logo-mark">
          <Zap className="xds-ico" aria-hidden="true" />
        </span>
        <div className="xds-sidebar-brand-text min-w-0">
          <div className="xds-t-body-sm" style={{ fontWeight: "var(--fw-semibold)" }}>
            XWorkmate
          </div>
          <div className="xds-t-caption">{copy.overview.heading}</div>
        </div>
      </a>

      <nav className="xds-sidebar-nav">
        {primarySections.map(renderSection)}

        {resourceSections.length > 0 ? (
          <div className="xds-nav-group">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
              aria-controls="panel-advanced-configuration"
              title={`${advancedLabel} · ${advancedDescription}`}
              className="xds-nav-item w-full"
            >
              <Settings2 className="xds-ico" aria-hidden="true" />
              <span className="xds-nav-item-label truncate">{advancedLabel}</span>
              <ChevronDown
                className={cn("xds-ico xds-caret", advancedOpen && "xds-is-open")}
                aria-hidden="true"
              />
            </button>
            {advancedOpen ? (
              <div id="panel-advanced-configuration" className="mt-1">
                {resourceSections.flatMap((section) => section.items.map(renderItem))}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>

      <div className="xds-sidebar-foot">
        <button
          type="button"
          className="xds-btn xds-btn-primary xds-btn-block"
          title={language === "zh" ? "创建项目" : "New Project"}
        >
          <Plus className="xds-ico" aria-hidden="true" />
          <span className="xds-nav-item-label">
            {language === "zh" ? "创建项目" : "New Project"}
          </span>
        </button>
      </div>
    </>
  );
}
