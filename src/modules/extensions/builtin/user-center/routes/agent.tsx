'use client'

import { MapPin } from 'lucide-react'

import { useLanguage } from '@i18n/LanguageProvider'

const XCONNECT_REGIONAL_POOLS = [
  { region: 'jpn-tky', zhName: '日本', enName: 'Japan', fqdn: 'JP-XConnect.svc.plus' },
  { region: 'us-ca', zhName: '美国', enName: 'United States', fqdn: 'US-XConnect.svc.plus' },
  { region: 'hk', zhName: '香港', enName: 'Hong Kong', fqdn: 'HK-XConnect.svc.plus' },
  { region: 'ph-mnl', zhName: '菲律宾', enName: 'Philippines', fqdn: 'PH-XConnect.svc.plus' },
] as const

export default function UserCenterAgentRoute() {
  const { language } = useLanguage()
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-heading)]">
            {language === 'zh' ? '区域入口与 pool' : 'Regional entry points & pools'}
          </h1>
          <p className="text-sm text-[var(--color-text-subtle)]">
            {language === 'zh' ? '仅展示区域入口域名与 pool 数量，不展示具体运行节点。' : 'Shows regional entry domains and pool counts only; individual runtime nodes are not displayed.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {XCONNECT_REGIONAL_POOLS.map((pool) => (
            <section
              key={pool.region}
              className="rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-subtle)]">
                  {language === 'zh' ? '1 个 pool' : '1 pool'}
                </span>
              </div>
              <div className="mt-4">
                <h2 className="font-bold text-[var(--color-heading)]">
                  {language === 'zh' ? pool.zhName : pool.enName}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-subtle)]">{pool.region}</p>
              </div>
              <div className="mt-6 border-t border-[color:var(--color-surface-border)] pt-4">
                <p className="text-eyebrow text-[var(--color-text-subtle)]">
                  {language === 'zh' ? '区域入口' : 'Regional entry point'}
                </p>
                <p className="mt-1 break-all text-sm font-medium text-[var(--color-text)]">{pool.fqdn}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
