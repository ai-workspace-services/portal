"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "../components/theme";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { useMoltbotStore } from "../lib/moltbotStore";
import { cn } from "../lib/utils";
import type { IntegrationDefaults } from "@/lib/openclaw/types";
import { useOpenClawConsoleStore } from "@/state/openclawConsoleStore";

export function AppProviders({
  children,
  assistantDefaults,
}: {
  children: ReactNode;
  assistantDefaults: IntegrationDefaults;
}) {
  const { isOpen, isMinimized, close, toggleOpen } = useMoltbotStore();
  const applyDefaults = useOpenClawConsoleStore((state) => state.applyDefaults);
  const setScope = useOpenClawConsoleStore((state) => state.setScope);
  const pathname = usePathname();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isOpenClawWorkspace =
    pathname.startsWith("/xworkmate") ||
    pathname.startsWith("/services/openclaw");
  const isHomepage = pathname === "/";

  const reserveSpace =
    !isOpenClawWorkspace &&
    !isHomepage &&
    isOpen &&
    !isMinimized &&
    !isMobileViewport;

  useEffect(() => {
    setScope("global", assistantDefaults);
    applyDefaults(assistantDefaults);
  }, [applyDefaults, assistantDefaults, setScope]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport && !isOpenClawWorkspace) {
      close();
    }
  }, [close, isMobileViewport, isOpenClawWorkspace]);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="flex flex-col min-h-screen">
          <div
            style={
              {
                "--assistant-reserve-offset": reserveSpace ? "400px" : "0px",
              } as CSSProperties
            }
            className={cn(
              "flex-1 flex flex-col relative w-full overflow-hidden transition-[padding] duration-300 ease-in-out",
              reserveSpace ? "pr-[400px]" : "",
            )}
          >
            <div className="flex-1 flex flex-col w-full relative">
              {children}
            </div>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}
