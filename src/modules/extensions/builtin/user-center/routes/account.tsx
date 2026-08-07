'use client'

import Breadcrumbs from '@/app/panel/components/Breadcrumbs'
import { usePathname } from 'next/navigation'
import MfaSetupPanel from '../account/MfaSetupPanel'
import SubscriptionPanel from '../account/SubscriptionPanel'
import AccountConnectionsPanel from '../components/AccountConnectionsPanel'
import AccountPolicySecurityPanel from '../components/AccountPolicySecurityPanel'
import AccountSection from '../components/AccountSection'
import UserOverview from '../components/UserOverview'
import ServiceReadinessCard from '../components/ServiceReadinessCard'
import { useUserStore } from '@lib/userStore'
import { useLanguage } from '@i18n/LanguageProvider'
import { translations } from '@i18n/translations'

export default function UserCenterAccountRoute() {
  const pathname = usePathname()
  const user = useUserStore((state) => state.user)
  const isReadOnlyRole = Boolean(user?.isReadOnly)
  const { language } = useLanguage()
  const copy = translations[language].userCenter.account
  const uuid = user?.uuid ?? user?.id ?? null
  const isUserCenterHome = pathname === '/panel'

  return (
    <div className="space-y-5">
      {!isUserCenterHome ? (
        <Breadcrumbs
          items={[
            { label: copy.breadcrumbs.dashboard, href: '/panel' },
            { label: copy.breadcrumbs.account, href: '/panel/account' },
          ]}
        />
      ) : null}
      <header className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3.5 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Account console</p>
        <div className="mt-1 flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-heading)] sm:text-2xl">账户与服务总览</h1>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-[var(--color-text-subtle)] sm:text-sm">集中查看订阅配额、连接节点、策略快照与账户安全状态。</p>
          </div>
          <p className="text-[11px] text-[var(--color-text-subtle)]">数据以当前账号 API 返回为准</p>
        </div>
      </header>

      <AccountSection id="account-overview" eyebrow="Profile" title="账户概览" description="身份信息与访问凭证。">
        <UserOverview hideMfaMainPrompt dashboardLayout hideVless showIdentityNote={false} />
      </AccountSection>

      {!isReadOnlyRole ? (
        <AccountSection id="billing-quota" eyebrow="Billing & quota" title="订阅与配额" description="套餐、用量、余额和账单分录均来自现有订阅与 accounts.svc.plus 接口。">
          <SubscriptionPanel />
        </AccountSection>
      ) : null}

      <AccountSection id="connections" eyebrow="Connections" title="VLESS 连接与节点" description="使用服务端返回的节点配置生成连接信息；页面不推断或伪造在线、延迟与负载。">
        <AccountConnectionsPanel uuid={uuid} />
      </AccountSection>

      <AccountSection id="policy-security" eyebrow="Policy & security" title="策略与安全" description="策略快照和安全状态分开呈现，便于确认当前访问保护与路由约束。">
        <AccountPolicySecurityPanel
          mfaEnabled={Boolean(user?.mfaEnabled)}
          mfaPending={Boolean(user?.mfaPending)}
          canManageMfa={!isReadOnlyRole}
        />
        {!isReadOnlyRole ? <ServiceReadinessCard /> : null}
        {!isReadOnlyRole ? <MfaSetupPanel showSummary={false} /> : null}
      </AccountSection>
    </div>
  )
}
