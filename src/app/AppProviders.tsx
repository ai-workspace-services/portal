"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeProvider } from "../components/theme";
import { LanguageProvider } from "../i18n/LanguageProvider";
import type { IntegrationDefaults } from "@/lib/openclaw/types";
import { useOpenClawConsoleStore } from "@/state/openclawConsoleStore";

export function AppProviders({
  children,
  assistantDefaults,
}: {
  children: ReactNode;
  assistantDefaults: IntegrationDefaults;
}) {
  const applyDefaults = useOpenClawConsoleStore((state) => state.applyDefaults);
  const setScope = useOpenClawConsoleStore((state) => state.setScope);

  useEffect(() => {
    setScope("global", assistantDefaults);
    applyDefaults(assistantDefaults);
  }, [applyDefaults, assistantDefaults, setScope]);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1 flex flex-col relative w-full overflow-hidden">
            <div className="flex-1 flex flex-col w-full relative">
              {children}
            </div>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}
