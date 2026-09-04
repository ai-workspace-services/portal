'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'

import { useLanguage } from '@i18n/LanguageProvider'
import { translations } from '@i18n/translations'
import { getExtensionRegistry } from '@extensions/loader'

export interface Crumb {
  label: string
  href: string
}

export interface BreadcrumbsProps {
  items?: Crumb[]
  className?: string
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname()
  const { language } = useLanguage()
  const zh = language === 'zh'
  const copy = translations[language]?.userCenter

  const resolvedItems = useMemo(() => {
    if (items && items.length > 0) {
      return items
    }

    const registry = getExtensionRegistry()
    const rootLabel = copy?.overview?.heading || (zh ? '用户中心' : 'User Center')
    const crumbs: Crumb[] = [{ label: rootLabel, href: '/panel' }]

    if (!pathname || pathname === '/panel' || pathname === '/panel/') {
      crumbs.push({
        label: copy?.items?.dashboard || (zh ? '总览' : 'Overview'),
        href: '/panel',
      })
      return crumbs
    }

    const cleanPath = pathname.replace(/\/$/, '')
    const segments = cleanPath.replace(/^\/panel\/?/, '').split('/').filter(Boolean)

    if (segments.length === 0) {
      return crumbs
    }

    let currentAcc = '/panel'
    for (let i = 0; i < segments.length; i++) {
      currentAcc += `/${segments[i]}`
      const matchedRoute = registry.routes.find((r) => r.path === currentAcc)

      let label = ''
      if (matchedRoute) {
        if (
          matchedRoute.id &&
          copy?.items &&
          (copy.items as Record<string, string>)[matchedRoute.id]
        ) {
          label = (copy.items as Record<string, string>)[matchedRoute.id]
        } else if (matchedRoute.label) {
          label = matchedRoute.label
        }
      }

      if (!label) {
        // If not matched and is an intermediate segment whose child route exists, skip intermediate dead link
        const isIntermediate = i < segments.length - 1
        const hasDeeperMatch = registry.routes.some((r) => r.path.startsWith(`${currentAcc}/`))
        if (isIntermediate && hasDeeperMatch) {
          continue
        }

        if (segments[i] === 'ops') {
          label = zh ? '运营工作台' : 'Operations'
        } else if (segments[i] === 'management') {
          label = zh ? '用户管理' : 'Management'
        } else if (segments[i] === 'account') {
          label = copy?.items?.accounts || (zh ? '账户中心' : 'Accounts')
        } else if (segments[i] === 'subscription') {
          label = copy?.items?.subscription || (zh ? '订阅计划' : 'Subscription')
        } else if (segments[i] === 'agent') {
          label = copy?.items?.agents || (zh ? '运行节点' : 'Agents')
        } else if (segments[i] === 'api') {
          label = copy?.items?.apis || (zh ? '接口集成' : 'Integrations')
        } else if (segments[i] === 'appearance') {
          label = copy?.items?.appearance || (zh ? '个性化' : 'Appearance')
        } else if (segments[i] === 'ldp') {
          label = copy?.items?.ldp || 'LDP'
        } else if (segments[i] === 'deployments') {
          label = copy?.items?.deployments || (zh ? '部署管理' : 'Deployments')
        } else if (segments[i] === 'resources') {
          label = copy?.items?.resources || (zh ? '资源列表' : 'Resources')
        } else if (segments[i] === 'api-keys') {
          label = copy?.items?.apiKeys || (zh ? '接口密钥' : 'API Keys')
        } else if (segments[i] === 'observability') {
          label = copy?.items?.logs || (zh ? '可观测性' : 'Observability')
        } else if (segments[i] === 'settings') {
          label = copy?.items?.settings || (zh ? '系统设置' : 'Settings')
        } else if (segments[i] === 'ledger') {
          label = zh ? '计费运营总览' : 'Billing Ledger'
        } else if (segments[i] === 'plans') {
          label = zh ? '套餐与订阅' : 'Plans'
        } else if (segments[i] === 'accounts' && currentAcc.startsWith('/panel/ops')) {
          label = zh ? '账号处置台' : 'Account Triage'
        } else if (segments[i] === 'audit') {
          label = zh ? '审计日志' : 'Audit Logs'
        } else if (segments[i] === 'system') {
          label = zh ? '系统管理' : 'System'
        } else {
          label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1)
        }
      }

      crumbs.push({
        label,
        href: currentAcc,
      })
    }

    return crumbs
  }, [items, pathname, copy, zh])

  return (
    <nav className={`flex min-w-0 items-center ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex min-w-0 items-center space-x-1 text-caption sm:space-x-1.5">
        {resolvedItems.map((item, index) => {
          const isLast = index === resolvedItems.length - 1
          return (
            <li key={`${item.href}-${index}`} className="inline-flex min-w-0 items-center">
              {index > 0 && (
                <ChevronRight
                  className="mx-1 h-3.5 w-3.5 shrink-0 text-[var(--color-text-subtle)] opacity-40"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  className="max-w-[130px] cursor-default truncate font-semibold text-[var(--color-heading)] sm:max-w-[200px] md:max-w-none"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="max-w-[100px] truncate font-medium text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-heading)] sm:max-w-[140px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
