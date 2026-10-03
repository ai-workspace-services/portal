'use client'

import React, { useState, useEffect } from 'react'
import {
  Activity,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  ExternalLink,
  Layers,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react'

interface CpaNode {
  id: string
  name: string
  role: 'aggregator-core' | 'cpa-node' | 'cpa-desktop'
  provider: 'AWS Spot' | 'VPS (Linode)' | 'VPS (Hetzner)' | 'GCP Cloud'
  region: string
  status: 'Healthy' | 'Degraded' | 'Offline'
  heartbeat: string
  models: string[]
  playbookOrToolkit: string
}

export default function UserCenterAiAggregatorRoute() {
  const [copied, setCopied] = useState(false)
  const [isUat, setIsUat] = useState(true)
  const [activeTab, setActiveTab] = useState<'topology' | 'nodes' | 'quickstart'>('topology')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase()
      setIsUat(hostname.includes('onwalk.net') || hostname.includes('uat') || hostname.includes('localhost'))
    }
  }, [])

  const currentHost = isUat ? 'ai.onwalk.net' : 'ai.svc.plus'
  const endpointUrl = `https://${currentHost}/v1`
  const consoleUrl = `https://${currentHost}`

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const cpaNodes: CpaNode[] = [
    {
      id: 'agg-master-01',
      name: 'AI Aggregator Master Ingress',
      role: 'aggregator-core',
      provider: isUat ? 'AWS Spot' : 'GCP Cloud',
      region: 'ap-northeast-1 (Tokyo)',
      status: 'Healthy',
      heartbeat: '5s ago',
      models: ['OpenAI', 'Claude', 'Gemini', 'DeepSeek'],
      playbookOrToolkit: 'platform-ops-toolkit',
    },
    {
      id: 'cpa-tokyo-01',
      name: 'CPA Desktop Tokyo PoP',
      role: 'cpa-node',
      provider: 'VPS (Linode)',
      region: 'jp-tyo-1 (Tokyo)',
      status: 'Healthy',
      heartbeat: '12s ago',
      models: ['@anthropic-ai/claude-code', 'Codex'],
      playbookOrToolkit: 'deploy_ai_desktop.yml',
    },
    {
      id: 'cpa-frankfurt-01',
      name: 'CPA Desktop Frankfurt PoP',
      role: 'cpa-desktop',
      provider: 'VPS (Hetzner)',
      region: 'eu-central-1 (Falkenstein)',
      status: 'Healthy',
      heartbeat: '25s ago',
      models: ['@anthropic-ai/claude-code', 'Gemini Pro'],
      playbookOrToolkit: 'deploy_ai_desktop.yml',
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── 面板导航面包屑 ── */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <a href="/panel" className="hover:text-slate-800 transition">
          控制台
        </a>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-900">AI Aggregator 控制面</span>
      </nav>

      {/* ── 顶层控制面概览 ── */}
      <section className="rounded-[1.8rem] border border-slate-900/10 bg-gradient-to-br from-white via-[#fbfaf7] to-[#f4f0ea] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Network className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                AI Aggregator 控制面
              </h1>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  isUat
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isUat ? 'UAT 控制面 (ai.onwalk.net)' : 'PROD 控制面 (ai.svc.plus)'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                网关与 CPA 节点全量在线
              </span>
            </div>
            <p className="text-sm text-slate-600">
              平台多渠道模型算力接入控制中枢：由 <code className="font-mono text-xs bg-white/80 px-1 py-0.5 rounded border border-slate-200 text-slate-700">platform-ops-toolkit</code> 部署 Aggregator 调度网关，配合 <code className="font-mono text-xs bg-white/80 px-1 py-0.5 rounded border border-slate-200 text-slate-700">deploy_ai_desktop.yml</code> 编排分布式 CPA 节点。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新拓扑
            </button>
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover transition"
            >
              进入 New API 网关管理
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* 标签切换导航 */}
        <div className="mt-6 flex border-b border-slate-200 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('topology')}
            className={`pb-3 border-b-2 px-3 transition ${
              activeTab === 'topology'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            架构与部署双平面
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nodes')}
            className={`pb-3 border-b-2 px-3 transition ${
              activeTab === 'nodes'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            CPA 节点与网关矩阵 ({cpaNodes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quickstart')}
            className={`pb-3 border-b-2 px-3 transition ${
              activeTab === 'quickstart'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            端点与开发者接入
          </button>
        </div>
      </section>

      {/* ── Tab 1: 架构与部署双平面 ── */}
      {activeTab === 'topology' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 部署平面 1: platform-ops-toolkit (AI Aggregator 套件) */}
            <div className="rounded-[1.6rem] border border-slate-900/10 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">AI Aggregator 调度套件</h2>
                    <p className="text-xs text-slate-500">统一入口、用户鉴权与 Token 配额中枢</p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  platform-ops-toolkit
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
                  <span className="font-semibold text-slate-700">部署与编排链路</span>
                  <p className="mt-1 font-mono text-[11px] text-slate-600">
                    platform-ops-toolkit/.github/workflows/ai-aggregator-v1.yml
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">Caddy Edge Gateway</span>
                    <div className="mt-1 font-semibold text-slate-800">Caddy 2.8 (mTLS / ACME)</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">调度引擎</span>
                    <div className="mt-1 font-semibold text-slate-800">New API (v0.4.x+)</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">凭据管理平面</span>
                    <div className="mt-1 font-semibold text-slate-800">Vault KV v2 动态轮转</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">算力拓扑规格</span>
                    <div className="mt-1 font-semibold text-slate-800">
                      {isUat ? 'AWS Spot t4g.medium (1h 临时)' : 'Prod 4C8G 高可用集群'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 部署平面 2: playbooks/deploy_ai_desktop.yml (CPA 节点集群) */}
            <div className="rounded-[1.6rem] border border-slate-900/10 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">CPA 节点集群 (CLIProxyAPI)</h2>
                    <p className="text-xs text-slate-500">执行端模型中继与 Desktop CodeAgent 运行时</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  deploy_ai_desktop.yml
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
                  <span className="font-semibold text-slate-700">Ansible 编排剧本</span>
                  <p className="mt-1 font-mono text-[11px] text-slate-600">
                    playbooks/deploy_ai_desktop.yml (group: ai_aggregator_cpa)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">核心执行角色</span>
                    <div className="mt-1 font-semibold text-slate-800">roles/vhosts/ai_desktop</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">CodeAgent 运行时</span>
                    <div className="mt-1 font-semibold text-slate-800">@anthropic-ai/claude-code, codex</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">健康度观测</span>
                    <div className="mt-1 font-semibold text-slate-800">Node Exporter &amp; Heartbeat</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500">节点隔离模型</span>
                    <div className="mt-1 font-semibold text-slate-800">VPS / Desktop 专属单租户</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 双引擎协同说明 */}
          <div className="rounded-[1.6rem] border border-slate-900/10 bg-slate-50/80 p-5">
            <div className="flex items-start gap-3">
              <Boxes className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">控制面协同设计规范：</span>
                <p>
                  1. 客户端应用（Cursor / IDE / Agent SDK）通过统一域名 <code className="font-mono font-semibold text-slate-800">{currentHost}</code> 接入由 <strong>platform-ops-toolkit</strong> 编排的 AI Aggregator 调度网关。
                </p>
                <p>
                  2. 调度网关根据路由策略与配额，将请求负载均衡分发至由 <strong>deploy_ai_desktop.yml</strong> 交付的各个分布式 <strong>CPA 节点</strong>，实现长连接保持、自动化凭据轮转与故障容灾。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: CPA 节点与网关矩阵 ── */}
      {activeTab === 'nodes' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cpaNodes.map((node) => (
              <div
                key={node.id}
                className="rounded-[1.4rem] border border-slate-900/10 bg-white p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-sm text-slate-900">{node.name}</span>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {node.provider}
                    </span>
                  </div>

                  <dl className="mt-4 divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-1.5">
                      <dt className="text-slate-500">部署来源</dt>
                      <dd className="font-mono text-slate-800">{node.playbookOrToolkit}</dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <dt className="text-slate-500">地域分布</dt>
                      <dd className="text-slate-800">{node.region}</dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <dt className="text-slate-500">心跳检测</dt>
                      <dd className="text-slate-600">{node.heartbeat}</dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <dt className="text-slate-500">状态</dt>
                      <dd className="font-medium text-emerald-600">{node.status}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                  {node.models.map((m) => (
                    <span
                      key={m}
                      className="rounded bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-600"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Tab 3: 端点与开发者接入 ── */}
      {activeTab === 'quickstart' && (
        <div className="space-y-6">
          <section className="rounded-[1.6rem] border border-slate-900/10 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900">统一兼容接入端点</h2>
            <p className="mt-1 text-sm text-slate-500">
              原生兼容 OpenAI 与 Claude SDK 格式，可直接配置进 IDE、Cursor 与自动化 Agent。
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-800">
                {endpointUrl}
              </div>
              <button
                type="button"
                onClick={() => handleCopy(endpointUrl)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-900/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    复制端点
                  </>
                )}
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-900/10 bg-slate-900 p-5 text-slate-100 font-mono text-xs shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400">
                <span>OpenAI / Cursor 配置示例</span>
                <Terminal className="h-4 w-4" />
              </div>
              <pre className="mt-4 overflow-x-auto text-[11px] leading-relaxed text-slate-300">
{`export OPENAI_BASE_URL="https://${currentHost}/v1"
export OPENAI_API_KEY="sk-aggregator-token"

# Python 示例
from openai import OpenAI
client = OpenAI(
  base_url="https://${currentHost}/v1",
  api_key="sk-aggregator-token"
)`}
              </pre>
            </div>

            <div className="rounded-[1.6rem] border border-slate-900/10 bg-slate-900 p-5 text-slate-100 font-mono text-xs shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400">
                <span>Claude CodeAgent / CPA 直连示例</span>
                <Terminal className="h-4 w-4" />
              </div>
              <pre className="mt-4 overflow-x-auto text-[11px] leading-relaxed text-slate-300">
{`export ANTHROPIC_BASE_URL="https://${currentHost}"
export ANTHROPIC_API_KEY="sk-aggregator-token"

# 启动 CodeAgent
claude --model claude-3-5-sonnet-20241022`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
