'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { Server, MapPin, Plus, ExternalLink, RefreshCw } from 'lucide-react'

import { useLanguage } from '@i18n/LanguageProvider'
import { translations } from '@i18n/translations'
import { fetchAgentNodes } from '../lib/fetchAgentNodes'


interface VlessNode {
  name: string
  address: string
  port?: number
  transport?: string
  path?: string
  mode?: string
  security?: string
  uri_scheme_xhttp?: string
  uri_scheme_tcp?: string
}

function isDisplayableNode(node: VlessNode): boolean {
  const name = (node.name || '').trim().toLowerCase()
  const address = (node.address || '').trim()
  if (!address || address === '*') {
    return false
  }
  if (name.includes('internal agents') && name.includes('shared token')) {
    return false
  }
  return true
}

export default function UserCenterAgentRoute() {
  const { language } = useLanguage()
  const t = translations[language].userCenter
  const { data: nodes, error, isLoading, mutate } = useSWR<VlessNode[]>('user-center-agent-nodes', fetchAgentNodes)
  const visibleNodes = useMemo(() => {
    return (nodes ?? []).filter((node) => isDisplayableNode(node))
  }, [nodes])

  const effectiveNodes = useMemo(() => {
    return visibleNodes.length > 0 ? [...visibleNodes] : []
  }, [visibleNodes])

  const groupedNodes = useMemo(() => {
    const groups: Record<string, VlessNode[]> = {
      HK: [],
      JP: [],
      US: [],
      Other: [],
    }

    if (!effectiveNodes.length) return groups

    effectiveNodes.forEach((node) => {
      const name = node.name.toLowerCase()
      if (name.includes('hk')) groups.HK.push(node)
      else if (name.includes('jp')) groups.JP.push(node)
      else if (name.includes('us')) groups.US.push(node)
      else groups.Other.push(node)
    })

    return groups
  }, [effectiveNodes])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-heading)]">{t.items.agents}</h1>
          <p className="text-sm text-[var(--color-text-subtle)]">
            {language === 'zh' ? '查看并管理您在全球分布的运行节点。' : 'View and manage your globally distributed running nodes.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {language === 'zh' ? '刷新' : 'Refresh'}
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] shadow-sm transition-opacity hover:opacity-90">
            <Plus className="h-4 w-4" />
            {language === 'zh' ? '添加节点' : 'Add Node'}
          </button>
        </div>
      </div>

      <div className="grid gap-6">

        {error && (
          <div className="rounded-xl border border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/30 px-4 py-3 text-sm text-[var(--color-danger-foreground)]">
            {language === 'zh'
              ? `节点列表加载失败：${error.message}`
              : `Failed to load agent nodes: ${error.message}`}
          </div>
        )}

        {Object.entries(groupedNodes).map(([region, regionNodes]) => (
          regionNodes.length > 0 && (
            <section key={region} className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[var(--color-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--color-heading)]">
                  {region === 'Other' ? (language === 'zh' ? '其他地区' : 'Other Regions') : `${region} Region`}
                </h2>
                <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-subtle)]">
                  {regionNodes.length}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {regionNodes.map((node) => (
                  <div
                    key={node.address}
                    className="group relative rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 transition-all hover:border-[color:var(--color-primary-border)] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
                        <Server className="h-5 w-5" />
                      </div>
                      <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-eyebrow font-bold uppercase tracking-wider text-green-600 dark:bg-green-500/20 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Online
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-bold text-[var(--color-heading)] truncate">{node.name}</h3>
                      <p className="mt-1 text-xs text-[var(--color-text-subtle)] truncate">{node.address}</p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-[color:var(--color-surface-border)] pt-4">
                      <div className="text-eyebrow text-[var(--color-text-subtle)]">
                        Port: <span className="font-medium text-[var(--color-text)]">{node.port || 443}</span>
                      </div>
                      <button className="text-[var(--color-primary)] transition-transform hover:scale-110">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        ))}

        {!isLoading && effectiveNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/20 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-heading)]">
              {language === 'zh' ? '暂无运行节点' : 'No Running Nodes'}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
              {language === 'zh' ? '您可以点击上方按钮添加您的第一个节点。' : 'You can click the button above to add your first node.'}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/30 p-5 h-44" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
