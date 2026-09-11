/* eslint-disable @next/next/no-page-custom-font */


import './globals.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { AppProviders } from './AppProviders'
import { SiteAnalyticsBody, SiteAnalyticsScripts } from '@/components/analytics/SiteAnalytics'
import { resolveWebReleaseMetadata } from '@/lib/webReleaseMetadata'
import { getConsoleIntegrationDefaults } from '@/server/consoleIntegrations'

const PLATFORM_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://console.svc.plus'
const LLC_SITE_URL = 'https://xworktech.com'
const LLC_HOSTS = new Set(['xworktech.com', 'www.xworktech.com'])
const DEFAULT_TITLE = 'XWorkmate · XConnect · AI Workspace | XWork Technologies'
const DEFAULT_DESCRIPTION =
  'XWork Technologies 打造开放的 AI 工作空间平台:XWorkmate 让 AI 真正参与你的工作,XConnect 提供稳定安全的连接能力,Open Platform 提供开源、可控、可扩展的基础设施支撑。支持托管使用,也支持自建部署。'
const DEFAULT_OG_IMAGE = '/marketing/xworkmate-suite-hero.png'

async function siteUrlForRequest(): Promise<string> {
  const requestHeaders = await headers()
  const forwardedHost = requestHeaders.get('x-forwarded-host')
  const requestHost = (forwardedHost || requestHeaders.get('host') || '').split(',')[0].trim().split(':')[0].toLowerCase()
  return LLC_HOSTS.has(requestHost) ? LLC_SITE_URL : PLATFORM_SITE_URL
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await siteUrlForRequest()

  return {
    metadataBase: new URL(siteUrl),
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const assistantDefaults = getConsoleIntegrationDefaults()
  const releaseMetadata = resolveWebReleaseMetadata()
  const siteUrl = await siteUrlForRequest()
  const siteHost = new URL(siteUrl).host

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
              url: siteUrl,
              logo: `${siteUrl}/icons/cloudnative_32.png`,
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
              url: siteUrl,
              description: DEFAULT_DESCRIPTION,
            }).replace(/</g, '\\u003c'),
          }}
        />
        <SiteAnalyticsScripts siteHost={siteHost} />
      </head>
      <body className={bodyClassName}>
        <AppProviders assistantDefaults={assistantDefaults}>{children}</AppProviders>
        <SiteAnalyticsBody />
      </body>
    </html>
  )
}
