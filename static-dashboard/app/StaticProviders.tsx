"use client"

import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme"
import { LanguageProvider } from "@/i18n/LanguageProvider"

export function StaticProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="flex min-h-screen flex-col">
          <div className="relative flex w-full flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}
