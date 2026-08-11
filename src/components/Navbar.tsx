"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import {
  Menu,
  MessageSquare,
  BarChart2,
  Link as LinkIcon,
  Server,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { translations } from "../i18n/translations";
import LanguageToggle from "./LanguageToggle";
import { AskAIButton } from "./AskAIButton";
import ReleaseChannelSelector, {
  ReleaseChannel,
} from "./ReleaseChannelSelector";
import { hasPublicUserEmail } from "@lib/publicUserIdentity";
import { useUserStore } from "@lib/userStore";
// import SearchComponent from './search'

const CHANNEL_ORDER: ReleaseChannel[] = ["stable", "beta", "develop"];
const DEFAULT_CHANNELS: ReleaseChannel[] = ["stable"];
const RELEASE_CHANNEL_STORAGE_KEY = "cloudnative-suite.releaseChannels";

type NavSubItem = {
  key: string;
  label: string;
  href: string;
  togglePath?: string;
  channels?: ReleaseChannel[];
  enabled?: boolean;
};

export default function Navbar() {
  const pathname = usePathname();
  const isHiddenRoute = pathname
    ? [
        "/login",
        "/register",
        "/xconnect",
        "/xcloudflow",
        "/xscopehub",
        "/blogs",
      ].some((prefix) => pathname.startsWith(prefix))
    : false;
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<ReleaseChannel[]>([
    "stable",
  ]);
  const navRef = useRef<HTMLElement | null>(null);
  const { language } = useLanguage();
  const user = useUserStore((state) => state.user);
  const nav = translations[language].nav;
  const accountCopy = nav.account;
  const shouldRenderPublicEmail = hasPublicUserEmail({
    email: user?.email,
    role: user?.role,
  });
  const accountInitial =
    user?.username?.charAt(0)?.toUpperCase() ??
    (shouldRenderPublicEmail ? user?.email?.charAt(0)?.toUpperCase() : null) ??
    "?";
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(RELEASE_CHANNEL_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return;

      const normalized = CHANNEL_ORDER.filter((channel) =>
        parsed.includes(channel),
      );
      if (normalized.length === 0) return;

      const restored: ReleaseChannel[] = normalized.includes("stable")
        ? normalized
        : [...DEFAULT_CHANNELS, ...normalized];
      setSelectedChannels((current) => {
        if (
          current.length === restored.length &&
          current.every((value, index) => value === restored[index])
        ) {
          return current;
        }
        return restored;
      });
    } catch (error) {
      console.warn("Failed to restore release channels selection", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      RELEASE_CHANNEL_STORAGE_KEY,
      JSON.stringify(selectedChannels),
    );
  }, [selectedChannels]);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [user]);

  const accountChildren: NavSubItem[] = user
    ? [
        {
          key: "userCenter",
          label: accountCopy.userCenter,
          href: "/panel",
          togglePath: "/panel",
        },
        ...(user?.isAdmin || user?.isOperator
          ? [
              {
                key: "management",
                label: accountCopy.management,
                href: "/panel/management",
                togglePath: "/panel/management",
              } satisfies NavSubItem,
            ]
          : []),
        {
          key: "logout",
          label: accountCopy.logout,
          href: "/logout",
        },
      ]
    : [
        {
          key: "register",
          label: nav.account.register,
          href: "/register",
          togglePath: "/register",
        },
        {
          key: "login",
          label: nav.account.login,
          href: "/login",
          togglePath: "/login",
        },
      ];

  const accountLabel = nav.account.title;

  const toggleChannel = (channel: ReleaseChannel) => {
    if (channel === "stable") return;
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((value) => value !== channel)
        : [...prev, channel],
    );
  };

  const isChinese = language === "zh";
  const labels = {
    home: isChinese ? "首页" : "Home",
    docs: isChinese ? "文档" : "Docs",
    download: isChinese ? "博客" : "blog",
    openSource: isChinese ? "开源项目" : "Open source",
    about: isChinese ? "关于" : "About",
    moreServices: isChinese ? "更多服务" : "More services",
    chat: isChinese ? "X助手" : "X Assistant",
    homepage: translations[language].homepage,
    overview: isChinese ? "概览" : "Overview",
    instances: isChinese ? "实例管理" : "Instances",
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = navRef.current;
    if (!element) {
      return;
    }

    const updateOffset = () => {
      const height = element.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--app-shell-nav-offset",
        `${height}px`,
      );
    };

    updateOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateOffset();
    });

    resizeObserver.observe(element);
    window.addEventListener("resize", updateOffset);

    return () => {
      window.removeEventListener("resize", updateOffset);
      resizeObserver.disconnect();
    };
  }, []);

  const mainLinks = [
    { key: "home", label: labels.home, href: "/" },
    { key: "docs", label: labels.docs, href: "/docs" },
  ];

  const downloadLink = { key: "blog", label: labels.download, href: "/blogs" };

  const servicesLink = {
    key: "services",
    label: labels.moreServices,
    href: "/services",
  };

  const openSourceProjects = [
    { key: "xconnect", label: "XConnect", href: "/xconnect" },
    { key: "xcloudflow", label: "XCloudFlow", href: "/xcloudflow" },
    { key: "xscopehub", label: "XScopeHub", href: "/xscopehub" },
  ];

  if (isHiddenRoute) {
    return null;
  }

  const mobileTabs = [
    {
      key: "home",
      label: labels.home,
      icon: ({ className }: { className?: string }) => (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      href: "/",
      active: pathname === "/",
    },
    {
      key: "chat",
      label: labels.chat,
      icon: MessageSquare,
      href: "/xworkmate",
      active: pathname?.startsWith("/xworkmate"),
    },
    {
      key: "overview",
      label: labels.overview,
      icon: BarChart2,
      href: "/panel",
      active: pathname === "/panel",
    },
    {
      key: "docs",
      label: labels.docs,
      icon: ({ className }: { className?: string }) => (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.082.477 4 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
      href: "/docs",
      active: pathname?.startsWith("/docs"),
    },
    {
      key: "services",
      label: labels.moreServices,
      icon: LinkIcon,
      href: "/services",
      active: pathname === "/services",
    },
    ...(user?.isAdmin || user?.isOperator
      ? [
          {
            key: "instances",
            label: labels.instances,
            icon: Server,
            href: "/panel/management",
            active: pathname === "/panel/management",
          },
        ]
      : []),
    {
      key: "about",
      label: labels.about,
      icon: ({ className }: { className?: string }) => (
        <svg
          className={className}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      href: "/about",
      active: pathname === "/about",
    },
    ...(!user
      ? [
          {
            key: "login",
            label: nav.account.login,
            icon: ({ className }: { className?: string }) => (
              <svg
                className={className}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            ),
            href: "/login",
            active: pathname?.startsWith("/login"),
          },
        ]
      : []),
  ];

  return (
    <>
      <nav
        ref={navRef}
        style={{
          width: "calc(100% + var(--assistant-reserve-offset, 0px))",
          marginRight: "calc(var(--assistant-reserve-offset, 0px) * -1)",
        }}
        className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/95 text-text backdrop-blur transition-colors duration-150"
      >
        {/* Mobile Header Layout */}
        <div className="lg:hidden flex flex-col bg-background">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 -ml-2 rounded-xl bg-surface-muted hover:bg-surface-hover text-text transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link
                href="/"
                className="flex items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <Image
                  src="/icons/cloudnative_32.png"
                  alt="logo"
                  width={24}
                  height={24}
                  className="h-6 w-6"
                  unoptimized
                />
                <span className="font-bold text-lg tracking-tight">
                  Cloud-Neutral
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Secondary Horizontal Scroll Menu - Only show on homepage as requested */}
        {pathname === "/" && (
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto py-2 px-4 no-scrollbar border-t border-surface-border/50">
            {mobileTabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  tab.active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-muted hover:text-text hover:bg-surface-muted border border-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            ))}
          </div>
        )}

        <div className="hidden lg:block mx-auto w-full max-w-7xl px-6 sm:px-8">
          <div className="flex items-center gap-5 py-3">
            <div className="flex flex-1 items-center gap-5">
              <Link
                href="/"
                className="hidden lg:flex items-center gap-2 rounded-md border border-surface-border bg-surface-muted/60 px-2.5 py-1.5 text-sm font-medium text-text/90 transition hover:bg-surface-hover/60"
              >
                <Image
                  src="/icons/cloudnative_32.png"
                  alt="logo"
                  width={24}
                  height={24}
                  className="h-[20px] w-[20px] opacity-90"
                  unoptimized
                />
                <span className="text-sm font-medium opacity-90 text-text">
                  Cloud-Neutral
                </span>
              </Link>
              <div className="hidden items-center gap-5 text-sm font-medium text-text-muted lg:flex">
                {mainLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="whitespace-nowrap text-sm opacity-80 transition hover:text-primary hover:opacity-100"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  key={downloadLink.key}
                  href={downloadLink.href}
                  className="whitespace-nowrap text-sm opacity-80 transition hover:text-primary hover:opacity-100"
                >
                  {downloadLink.label}
                </Link>
                <div className="group relative">
                  <button className="flex items-center gap-1 whitespace-nowrap text-sm opacity-80 transition hover:text-primary hover:opacity-100">
                    <span>{labels.openSource}</span>
                    <svg
                      className="h-4 w-4 text-text-subtle transition group-hover:text-primary"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <div className="absolute left-0 top-full hidden min-w-[200px] translate-y-1 rounded-lg border border-surface-border bg-surface/95 py-2 text-sm text-text opacity-0 shadow-shadow-md transition-all duration-200 group-hover:block group-hover:translate-y-2 group-hover:opacity-100 group-focus-within:block group-focus-within:translate-y-2 group-focus-within:opacity-100">
                    {openSourceProjects.map((project) => (
                      <Link
                        key={project.key}
                        href={project.href}
                        className="block px-4 py-2 text-sm opacity-80 transition hover:bg-primary/10 hover:text-primary hover:opacity-100"
                      >
                        {project.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <Link
                  href="/about"
                  className="whitespace-nowrap text-sm opacity-80 transition hover:text-primary hover:opacity-100"
                >
                  {labels.about}
                </Link>
                <Link
                  key={servicesLink.key}
                  href={servicesLink.href}
                  className="whitespace-nowrap text-sm opacity-80 transition hover:text-primary hover:opacity-100"
                >
                  {servicesLink.label}
                </Link>
              </div>
            </div>

            <div className="hidden flex-1 items-center justify-end gap-4 lg:flex">
              {/* <SearchComponent className="relative w-full max-w-xs" /> */}
              {user ? (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-white shadow-shadow-sm transition hover:from-primary-hover hover:to-accent focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-background"
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                  >
                    {accountInitial}
                  </button>
                  {accountMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-surface-border bg-surface/95 shadow-shadow-md">
                      <div className="border-b border-surface-border bg-surface-muted px-4 py-3">
                        <p className="text-sm font-semibold text-text">
                          {user.username}
                        </p>
                        {shouldRenderPublicEmail ? (
                          <p className="text-xs text-text-muted">{user.email}</p>
                        ) : null}
                      </div>
                      <div className="py-1 text-sm text-text">
                        <Link
                          href="/panel"
                          className="block px-4 py-2 text-sm opacity-80 transition hover:bg-primary/10 hover:opacity-100"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          {accountCopy.userCenter}
                        </Link>
                        <Link
                          href="/logout"
                          className="flex w-full items-center px-4 py-2 text-left text-sm text-danger-foreground opacity-80 transition hover:bg-danger/10 hover:opacity-100"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          {accountCopy.logout}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm font-medium text-text-muted">
                  <Link
                    href="/login"
                    className="text-sm opacity-80 transition hover:text-primary hover:opacity-100"
                  >
                    {nav.account.login}
                  </Link>
                  <span
                    className="h-3 w-px bg-surface-border"
                    aria-hidden="true"
                  />
                  <Link
                    href="/register"
                    className="rounded-md border border-surface-border px-3 py-1 text-primary transition hover:border-primary/40 hover:bg-surface-muted"
                  >
                    {nav.account.register}
                  </Link>
                </div>
              )}
              {/* Mail feature temporarily disabled */}
              <LanguageToggle />
              <ReleaseChannelSelector
                selected={selectedChannels}
                onToggle={toggleChannel}
                variant="icon"
              />
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setMenuOpen(false)}
            />

            {/* Content */}
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-background shadow-2xl transition-transform duration-300 ease-in-out">
              <div className="flex h-full flex-col overflow-y-auto border-r border-surface-border">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-surface-border p-4">
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Image
                      src="/icons/cloudnative_32.png"
                      alt="logo"
                      width={24}
                      height={24}
                      className="h-6 w-6"
                      unoptimized
                    />
                    <span className="text-lg font-bold tracking-tight">
                      Cloud-Neutral
                    </span>
                  </Link>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg p-2 text-text-muted hover:bg-surface-muted transition-colors"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* User Info Section (if logged in) */}
                {user && (
                  <div className="border-b border-surface-border bg-surface-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-white">
                        {accountInitial}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-semibold">
                          {user.username}
                        </p>
                        {shouldRenderPublicEmail ? (
                          <p className="truncate text-xs text-text-muted">
                            {user.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Items */}
                <div className="flex-1 p-4">
                  <div className="space-y-1">
                    <Link
                      href="/xworkmate"
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname?.startsWith("/xworkmate")
                          ? "bg-primary/10 text-primary"
                          : "text-text hover:bg-surface-muted"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <MessageSquare className="mr-3 h-5 w-5" />
                      {labels.chat}
                    </Link>
                    <Link
                      href="/"
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname === "/"
                          ? "bg-primary/10 text-primary"
                          : "text-text hover:bg-surface-muted"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Image
                        src="/icons/cloudnative_32.png"
                        alt="homepage"
                        width={20}
                        height={20}
                        className="mr-3 h-5 w-5 opacity-70"
                        unoptimized
                      />
                      {labels.homepage}
                    </Link>
                    <Link
                      href="/panel"
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname === "/panel"
                          ? "bg-primary/10 text-primary"
                          : "text-text hover:bg-surface-muted"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <BarChart2 className="mr-3 h-5 w-5 opacity-70" />
                      {isChinese ? "概览" : "Overview"}
                    </Link>
                    <Link
                      href="/docs"
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname?.startsWith("/docs")
                          ? "bg-primary/10 text-primary"
                          : "text-text hover:bg-surface-muted"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg
                        className="mr-3 h-5 w-5 opacity-70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.082.477 4 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      {labels.docs}
                    </Link>
                    <Link
                      href="/about"
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname === "/about"
                          ? "bg-primary/10 text-primary"
                          : "text-text hover:bg-surface-muted"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg
                        className="mr-3 h-5 w-5 opacity-70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {labels.about}
                    </Link>
                    <Link
                      href="/services"
                      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        pathname === "/services"
                          ? "bg-primary/10 text-primary"
                          : "text-text hover:bg-surface-muted"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <LinkIcon className="mr-3 h-5 w-5 opacity-70" />
                      {labels.moreServices}
                    </Link>
                    {(user?.isAdmin || user?.isOperator) && (
                      <Link
                        href="/panel/management"
                        className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          pathname === "/panel/management"
                            ? "bg-primary/10 text-primary"
                            : "text-text hover:bg-surface-muted"
                        }`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <Server className="mr-3 h-5 w-5 opacity-70" />
                        {isChinese ? "实例管理" : "Instances"}
                      </Link>
                    )}
                  </div>

                  {/* Account Action */}
                  <div className="mt-8 space-y-3 px-2">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-text-muted opacity-50">
                      {isChinese ? "账户" : "Account"}
                    </p>
                    {user ? (
                      <>
                        <Link
                          href="/panel"
                          className="flex w-full items-center justify-center rounded-xl border border-surface-border bg-surface-muted/50 py-3 text-sm font-bold shadow-sm transition hover:bg-surface-hover"
                          onClick={() => setMenuOpen(false)}
                        >
                          {accountCopy.userCenter}
                        </Link>
                        <Link
                          href="/logout"
                          className="flex w-full items-center justify-center rounded-xl bg-rose-500/10 py-3 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-500/20"
                          onClick={() => setMenuOpen(false)}
                        >
                          {accountCopy.logout}
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="flex w-full items-center justify-center rounded-xl border border-surface-border py-3 text-sm font-bold transition hover:bg-surface-muted"
                          onClick={() => setMenuOpen(false)}
                        >
                          {nav.account.login}
                        </Link>
                        <Link
                          href="/register"
                          className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]"
                          onClick={() => setMenuOpen(false)}
                        >
                          {nav.account.register}
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Settings */}
                <div className="border-t border-surface-border p-4 space-y-4">
                  <div className="flex flex-col gap-3">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-text-muted opacity-50">
                      {isChinese ? "设置" : "Settings"}
                    </p>
                    <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2">
                      <span className="ml-2 text-xs font-medium text-text-muted">
                        {isChinese ? "界面语言" : "Language"}
                      </span>
                      <LanguageToggle />
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-surface-muted/50 p-2">
                      <span className="ml-2 text-xs font-medium text-text-muted mb-1">
                        {isChinese ? "发布频道" : "Channels"}
                      </span>
                      <ReleaseChannelSelector
                        selected={selectedChannels}
                        onToggle={toggleChannel}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hide AskAI button on small screens since it's redundant with Chat on mobile */}
      <div className="hidden lg:block">
        <AskAIButton />
      </div>
    </>
  );
}
