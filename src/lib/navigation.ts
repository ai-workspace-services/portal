"use client";

import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  BarChart2,
  Link as LinkIcon,
  Server,
  LayoutDashboard,
  Rocket,
  Database,
  Key,
  History,
  Settings,
  Plus,
  Home,
  FileText,
  Book,
  Info,
  CreditCard,
  LifeBuoy,
  PackageOpen,
} from "lucide-react";

export type ReleaseChannel = "stable" | "beta" | "develop";

export type NavItem = {
  key: string;
  label: string | ((lang: string) => string);
  href: string;
  icon?: LucideIcon | ((props: any) => React.ReactNode);
  active?: (pathname: string) => boolean;
  channels?: ReleaseChannel[];
  enabled?: boolean;
  badge?: string;
  children?: NavItem[];
  showOn?: "desktop" | "mobile" | "both";
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireOperator?: boolean;
};

export const CHANNEL_ORDER: ReleaseChannel[] = ["stable", "beta", "develop"];
export const DEFAULT_CHANNELS: ReleaseChannel[] = ["stable"];
export const RELEASE_CHANNEL_STORAGE_KEY = "cloudnative-suite.releaseChannels";

export const getLabel = (
  label: string | ((lang: string) => string),
  lang: string,
): string => {
  return typeof label === "function" ? label(lang) : label;
};

export const createNavConfig = (
  language: string,
  isLoggedIn: boolean,
  isAdmin: boolean,
  isOperator: boolean,
): {
  mainNav: NavItem[];
  secondaryNav: NavItem[];
  accountNav: NavItem[];
} => {
  const isChinese = language === "zh";

  const mainNav: NavItem[] = [
    {
      key: "home",
      label: isChinese ? "首页" : "Home",
      href: "/",
      icon: Home,
      active: (pathname) => pathname === "/",
      showOn: "both",
    },
    {
      key: "chat",
      label: isChinese ? "X助手" : "X Assistant",
      href: "/xworkmate",
      icon: MessageSquare,
      active: (pathname) => pathname?.startsWith("/xworkmate"),
      showOn: "both",
    },
    {
      key: "xworkmateSuite",
      label: isChinese ? "产品矩阵" : "Suite",
      href: "/xworkmate-suite",
      icon: PackageOpen,
      active: (pathname) => pathname?.startsWith("/xworkmate-suite"),
      showOn: "both",
    },
    {
      key: "docs",
      label: isChinese ? "文档" : "Docs",
      href: "/docs",
      icon: FileText,
      active: (pathname) => pathname?.startsWith("/docs"),
      showOn: "both",
    },
    {
      key: "console",
      label: isChinese ? "控制台" : "Console",
      href: "/panel",
      icon: LayoutDashboard,
      active: (pathname) =>
        pathname.startsWith("/panel") &&
        !pathname.startsWith("/panel/management"),
      showOn: "both",
    },
    {
      key: "services",
      label: isChinese ? "更多服务" : "More Services",
      href: "/services",
      icon: Plus,
      active: (pathname) => pathname.startsWith("/services"),
      showOn: "both",
    },
    {
      key: "prices",
      label: isChinese ? "价格" : "Prices",
      href: "/prices",
      icon: CreditCard,
      active: (pathname) => pathname === "/prices",
      showOn: "both",
    },
    {
      key: "support",
      label: isChinese ? "支持" : "Support",
      href: "/support",
      icon: LifeBuoy,
      active: (pathname) => pathname === "/support",
      showOn: "both",
    },
    {
      key: "about",
      label: isChinese ? "关于" : "About",
      href: "/about",
      icon: Info,
      active: (pathname) => pathname === "/about",
      showOn: "both",
    },
  ];

  const secondaryNav: NavItem[] = [
    {
      key: "management",
      label: isChinese ? "实例管理" : "Instances",
      href: "/panel/management",
      icon: Server,
      active: (pathname) => pathname === "/panel/management",
      showOn: "both",
      requireAdmin: true,
      requireOperator: true,
    },
  ];

  const accountNav: NavItem[] = isLoggedIn
    ? [
        {
          key: "userCenter",
          label: isChinese ? "用户中心" : "User Center",
          href: "/panel",
          icon: BarChart2,
          showOn: "both",
        },
        ...(isAdmin || isOperator
          ? [
              {
                key: "management",
                label: isChinese ? "管理" : "Management",
                href: "/panel/management",
                icon: Settings,
                showOn: "both" as const,
              },
            ]
          : []),
        {
          key: "logout",
          label: isChinese ? "退出登录" : "Logout",
          href: "/logout",
          showOn: "both",
          badge: isChinese ? "退出" : "Logout",
        },
      ]
    : [
        {
          key: "register",
          label: isChinese ? "注册" : "Register",
          href: "/register",
          showOn: "both",
        },
        {
          key: "login",
          label: isChinese ? "登录" : "Login",
          href: "/login",
          showOn: "both",
        },
      ];

  return { mainNav, secondaryNav, accountNav };
};

export const filterNavItems = (items: NavItem[], user: any): NavItem[] => {
  return items.filter((item) => {
    if (item.requireAuth && !user) return false;
    if (item.requireAdmin && !user?.isAdmin) return false;
    if (item.requireOperator && !user?.isOperator) return false;
    if (item.enabled === false) return false;
    return true;
  });
};
