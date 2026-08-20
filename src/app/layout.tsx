/* eslint-disable @next/next/no-page-custom-font */


import './globals.css'
import type { Metadata } from 'next'
import { AppProviders } from './AppProviders'
import { SiteAnalyticsBody, SiteAnalyticsScripts } from '@/components/analytics/SiteAnalytics'
import { resolveWebReleaseMetadata } from '@/lib/webReleaseMetadata'
import { getConsoleIntegrationDefaults } from '@/server/consoleIntegrations'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://console.xworktech.com'
const SITE_HOST = new URL(SITE_URL).host
const DEFAULT_TITLE = 'XWorkmate · XConnect · AI Workspace | XWork Technologies'
const DEFAULT_DESCRIPTION =
  'XWork Technologies 打造开放的 AI 工作空间平台:XWorkmate 让 AI 真正参与你的工作,XConnect 提供稳定安全的连接能力,Open Platform 提供开源、可控、可扩展的基础设施支撑。支持托管使用,也支持自建部署。'
const DEFAULT_OG_IMAGE = '/marketing/xworkmate-suite-hero.png'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | XWork Technologies',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: 'XWorkmate',
  category: 'technology',
  keywords: [
    'XWorkmate',
    'XConnect',
    'AI Workspace',
    'Open Platform',
    'XWork Technologies',
    'AI 工作空间平台',
    'AI 协作工具',
    '开源云原生平台',
    'cloud-neutral infrastructure',
    'self-hosted AI platform',
  ],
  authors: [{ name: 'XWork Technologies' }],
  creator: 'XWork Technologies',
  publisher: 'XWork Technologies LLC',
  alternates: {
    canonical: '/',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    siteName: 'XWork Technologies',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1920,
        height: 1080,
        alt: 'XWorkmate · XConnect · AI Workspace — XWork Technologies Open Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const htmlAttributes = { lang: 'zh' }
const bodyClassName = 'bg-[var(--color-background)] text-[var(--color-text)]'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const assistantDefaults = getConsoleIntegrationDefaults()
  const releaseMetadata = resolveWebReleaseMetadata()

  return (
    <html {...htmlAttributes}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366f1" />
        {releaseMetadata.image ? <meta name="svc-plus-release-image" content={releaseMetadata.image} /> : null}
        {releaseMetadata.tag ? <meta name="svc-plus-release-tag" content={releaseMetadata.tag} /> : null}
        {releaseMetadata.commit ? <meta name="svc-plus-release-commit" content={releaseMetadata.commit} /> : null}
        {releaseMetadata.version ? <meta name="svc-plus-release-version" content={releaseMetadata.version} /> : null}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'XWork Technologies',
              url: SITE_URL,
              logo: `${SITE_URL}/icons/cloudnative_32.png`,
              description: DEFAULT_DESCRIPTION,
            }).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'XWork Technologies',
              url: SITE_URL,
              description: DEFAULT_DESCRIPTION,
            }).replace(/</g, '\\u003c'),
          }}
        />
        <SiteAnalyticsScripts siteHost={SITE_HOST} />
      </head>
      <body className={bodyClassName}>
        <AppProviders assistantDefaults={assistantDefaults}>{children}</AppProviders>
        <SiteAnalyticsBody />
      </body>
    </html>
  )
}
