"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import { Menu, X } from "lucide-react";
import { translations } from "../i18n/translations";
import LanguageToggle from "./LanguageToggle";
// import { AskAIButton } from "./AskAIButton";
import ReleaseChannelSelector from "./ReleaseChannelSelector";
import { hasPublicUserEmail } from "@lib/publicUserIdentity";
import { useUserStore } from "@lib/userStore";
import { useMoltbotStore } from "@lib/moltbotStore";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  createNavConfig,
  filterNavItems,
  type NavItem,
  type ReleaseChannel,
  DEFAULT_CHANNELS,
  RELEASE_CHANNEL_STORAGE_KEY,
  CHANNEL_ORDER,
} from "@lib/navigation";

const getLabel = (
  label: string | ((lang: string) => string),
  lang: string,
): string => {
  return typeof label === "function" ? label(lang) : label;
};

export default function UnifiedNavigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<ReleaseChannel[]>([
    "stable",
  ]);
  const navRef = useRef<HTMLElement | null>(null);
  const { language, setLanguage } = useLanguage();
  const user = useUserStore((state) => state.user);
  const { toggleOpen } = useMoltbotStore();
  const nav = translations[language].nav;
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
  const isChinese = language === "zh";

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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

  const toggleChannel = (channel: ReleaseChannel) => {
    if (channel === "stable") return;
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((value) => value !== channel)
        : [...prev, channel],
    );
  };

  const { mainNav, secondaryNav, accountNav } = createNavConfig(
    language,
    !!user,
    !!user?.isAdmin,
    !!user?.isOperator,
  );

  const filteredMainNav = filterNavItems(mainNav, user);
  const filteredSecondaryNav = filterNavItems(secondaryNav, user);
  const mobilePrimaryNav = [...filteredMainNav, ...filteredSecondaryNav].filter(
    (item) => item.showOn !== "desktop",
  );
  const mobileQuickLinks = mobilePrimaryNav.filter((item) =>
    ["chat", "console", "docs", "services"].includes(item.key),
  );
  const mobileMenuNav = mobilePrimaryNav.filter((item) => item.key !== "home");
  const primaryAccountAction = user
    ? (accountNav.find((item) => item.key !== "logout") ?? accountNav[0])
    : (accountNav.find((item) => item.key === "login") ?? accountNav[0]);
  const secondaryAccountAction = user
    ? accountNav.find((item) => item.key === "logout")
    : accountNav.find((item) => item.key === "register");

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

  if (isHiddenRoute) {
    return null;
  }

  const isActive = (item: NavItem): boolean => {
    if (item.active) {
      return item.active(pathname || "");
    }
    return pathname === item.href;
  };

  return (
    <>
      <nav
        ref={navRef}
        style={{
          width: "calc(100% + var(--assistant-reserve-offset, 0px))",
          marginRight: "calc(var(--assistant-reserve-offset, 0px) * -1)",
        }}
        className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/88 text-text backdrop-blur-xl transition-colors duration-150"
      >
        <div className="flex items-center justify-between border-b border-surface-border bg-background/92 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
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
            <span className="text-[13px] font-semibold tracking-[-0.02em] text-text">
              Cloud-Neutral
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="tactile-button tactile-button-soft h-8 w-8 rounded-[8px] p-0"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="mx-auto hidden w-full max-w-7xl px-6 sm:px-8 lg:block">
          <div className="flex items-center gap-4 py-2.5">
            <div className="flex flex-1 items-center">
              <nav className="hidden items-center gap-1 text-sm font-medium text-text-muted lg:flex whitespace-nowrap -ml-2">
                {filteredMainNav.map((item) => {
                  const active = isActive(item);
                  if (item.showOn === "mobile") return null;
                  if (item.key === "chat") {
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          toggleOpen();
                        }}
                        className={`tactile-button min-h-9 gap-1.5 rounded-[12px] px-3 py-2 text-[13px] shadow-none whitespace-nowrap ${
                          active
                            ? "border border-primary/10 bg-primary/12 text-primary"
                            : "text-text-muted hover:bg-surface-muted hover:text-text"
                        }`}
                      >
                        {item.icon && <item.icon className="w-4 h-4" />}
                        <span className="tracking-tight">
                          {getLabel(item.label, language)}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`tactile-button min-h-9 gap-1.5 rounded-[12px] px-3 py-2 text-[13px] shadow-none whitespace-nowrap ${
                        active
                          ? "border border-primary/10 bg-primary/12 text-primary"
                          : "text-text-muted hover:bg-surface-muted hover:text-text"
                      }`}
                    >
                      {item.icon && <item.icon className="w-4 h-4" />}
                      <span className="tracking-tight">
                        {getLabel(item.label, language)}
                      </span>
                    </Link>
                  );
                })}
                {filteredSecondaryNav.map((item) => {
                  const active = isActive(item);
                  if (item.showOn === "mobile") return null;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-text-muted hover:text-text hover:bg-surface-muted"
                      }`}
                    >
                      {item.icon && <item.icon className="w-4 h-4" />}
                      <span className="text-[13px] tracking-tight">
                        {getLabel(item.label, language)}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="hidden flex-1 items-center justify-end gap-3 lg:flex">
              {user ? (
                <div className="flex items-center gap-3">
                  <LanguageToggle />
                  <ReleaseChannelSelector
                    selected={selectedChannels}
                    onToggle={toggleChannel}
                    variant="icon"
                  />
                  <DropdownMenu.Root
                    open={accountMenuOpen}
                    onOpenChange={setAccountMenuOpen}
                  >
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        className="tactile-button tactile-button-primary h-10 w-10 rounded-[12px] p-0 text-sm outline-none"
                        aria-label="User account menu"
                      >
                        {accountInitial}
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={8}
                        className="z-50 min-w-[220px] overflow-hidden rounded-[12px] border border-surface-border bg-surface p-1 shadow-shadow-md animate-in fade-in zoom-in-95 duration-[120ms] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 motion-reduce:animate-none"
                      >
                        <div className="px-4 py-3 border-b border-surface-border/50 mb-1 text-right">
                          <p className="text-sm font-semibold text-text leading-none mb-1.5">
                            {user.username}
                          </p>
                          {shouldRenderPublicEmail ? (
                            <p className="text-[12px] text-text-muted leading-none break-all">
                              {user.email}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-0.5">
                          {accountNav.map((item) => (
                            <DropdownMenu.Item
                              key={item.key}
                              asChild
                              className="outline-none"
                            >
                              <Link
                                href={item.href}
                                className={`flex h-[38px] flex-row-reverse items-center justify-between gap-3 px-3 rounded-lg text-[13px] font-medium transition-all group select-none ${
                                  item.key === "logout"
                                    ? "text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 focus:bg-rose-500/10 focus:text-rose-600"
                                    : "text-text-muted hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                                }`}
                                onClick={() => setAccountMenuOpen(false)}
                              >
                                {item.icon && (
                                  <item.icon
                                    className={`w-4 h-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity ${item.key === "logout" ? "text-rose-500" : "text-current"}`}
                                  />
                                )}
                                <span className="flex-1 text-right">
                                  {typeof item.label === "function"
                                    ? item.label(language)
                                    : item.label}
                                </span>
                              </Link>
                            </DropdownMenu.Item>
                          ))}
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              ) : (
                <>
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
                      className="tactile-button tactile-button-soft min-h-10 px-4 text-primary"
                    >
                      {nav.account.register}
                    </Link>
                  </div>
                  <LanguageToggle />
                  <ReleaseChannelSelector
                    selected={selectedChannels}
                    onToggle={toggleChannel}
                    variant="icon"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label={isChinese ? "关闭菜单" : "Close menu"}
            className="absolute inset-0 bg-white/72 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-0 bg-background transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[max(1rem,env(safe-area-inset-top))] min-[430px]:pb-[calc(env(safe-area-inset-bottom)+2.25rem)]">
              <div className="flex items-center justify-between">
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
                  <span className="text-[1.7rem] font-semibold tracking-[-0.05em] text-text">
                    Cloud-Neutral
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
                    className="tactile-button tactile-button-soft h-10 min-w-10 px-3 text-xs uppercase tracking-[0.18em]"
                    aria-label={
                      isChinese ? "切换到英文" : "Switch language to Chinese"
                    }
                  >
                    {language === "zh" ? "EN" : "中"}
                  </button>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="tactile-button tactile-button-soft h-10 w-10 p-0"
                    aria-label={isChinese ? "关闭菜单" : "Close menu"}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between pt-8">
                <div className="relative min-h-0 flex-1">
                  <div className="max-w-[13rem] space-y-2.5 min-[430px]:max-w-[13.5rem]">
                    {mobileMenuNav.map((item) => {
                      const active = isActive(item);
                      if (item.key === "chat") {
                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              toggleOpen();
                              setMenuOpen(false);
                            }}
                            className={`block w-full py-1 text-left text-[1.95rem] font-semibold tracking-[-0.055em] transition-colors min-[430px]:text-[2rem] ${
                              active
                                ? "text-text"
                                : "text-text hover:text-primary"
                            }`}
                          >
                            {getLabel(item.label, language)}
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={`block py-1 text-[1.95rem] font-semibold tracking-[-0.055em] transition-colors min-[430px]:text-[2rem] ${
                            active
                              ? "text-text"
                              : "text-text hover:text-primary"
                          }`}
                          onClick={() => setMenuOpen(false)}
                        >
                          {getLabel(item.label, language)}
                        </Link>
                      );
                    })}
                  </div>

                  {mobileQuickLinks.length > 0 ? (
                    <div className="pointer-events-none absolute right-0 top-[60%] flex -translate-y-1/2 justify-end min-[390px]:top-[59%] min-[430px]:top-[58%]">
                      <div className="pointer-events-auto w-[min(10.75rem,45vw)] rounded-[14px] border border-surface-border/70 bg-surface-muted/84 p-4 shadow-[var(--shadow-md)]">
                        <div className="space-y-2.5">
                          {mobileQuickLinks.map((item) =>
                            item.key === "chat" ? (
                              <button
                                key={item.key}
                                onClick={() => {
                                  toggleOpen();
                                  setMenuOpen(false);
                                }}
                                className="block text-left text-[1.08rem] font-medium tracking-[-0.03em] text-text transition hover:text-primary"
                              >
                                {getLabel(item.label, language)}
                              </button>
                            ) : (
                              <Link
                                key={item.key}
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="block text-[1.08rem] font-medium tracking-[-0.03em] text-text transition hover:text-primary"
                              >
                                {getLabel(item.label, language)}
                              </Link>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-5 pt-8">
                  <div className="min-w-0">
                    {secondaryAccountAction ? (
                      <Link
                        href={secondaryAccountAction.href}
                        onClick={() => setMenuOpen(false)}
                        className="text-sm font-medium text-text-muted transition hover:text-text"
                      >
                        {typeof secondaryAccountAction.label === "function"
                          ? secondaryAccountAction.label(language)
                          : secondaryAccountAction.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-text-muted/60">
                        {isChinese ? "导航" : "Menu"}
                      </span>
                    )}
                  </div>

                  {primaryAccountAction ? (
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Link
                        href={primaryAccountAction.href}
                        onClick={() => setMenuOpen(false)}
                        className="tactile-button tactile-button-soft min-h-[3.1rem] min-w-[7rem] px-6 text-[1.05rem]"
                      >
                        {typeof primaryAccountAction.label === "function"
                          ? primaryAccountAction.label(language)
                          : primaryAccountAction.label}
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* <div className="hidden lg:block">
        <AskAIButton />
      </div> Removed to merge AI assistant into navbar and sidebar only */}
    </>
  );
}
