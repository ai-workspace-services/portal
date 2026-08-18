/* eslint-disable @next/next/no-page-custom-font */

import type { Metadata } from "next"

import "../../src/app/globals.css"
import { StaticProviders } from "./StaticProviders"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://console.xworktech.com"
const title = "XWorkmate · XConnect · AI Workspace | XWork Technologies"
const description =
  "XWork Technologies 打造开放的 AI 工作空间平台，支持托管使用和自建部署。"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    title,
    description,
    siteName: "XWork Technologies",
    images: ["/marketing/xworkmate-suite-hero.png"],
  },
}

export default function StaticDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className="bg-[var(--color-background)] text-[var(--color-text)]">
        <StaticProviders>{children}</StaticProviders>
      </body>
    </html>
  )
}
