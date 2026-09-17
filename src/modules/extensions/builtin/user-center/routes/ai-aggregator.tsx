'use client'

import React, { useState, useEffect } from 'react'
import {
  Activity,
  ArrowUpRight,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  Layers,
  Network,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export default function UserCenterAiAggregatorRoute() {
  const [copied, setCopied] = useState(false)
  const [isUat, setIsUat] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase()
      setIsUat(hostname.includes('onwalk.net') || hostname.includes('uat') || hostname.includes('localhost'))
    }
  }, [])

  const currentHost = isUat ? 'ai.onwalk.net' : 'ai.svc.plus'
  const endpointUrl = `https://${currentHost}/v1`
  const consoleUrl = `https://${currentHost}`

  const handleCopy = () => {
    navigator.clipboard.writeText(endpointUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* 头部面板 */}
      <section className="rounded-[1.8rem] border border-slate-900/10 bg-gradient-to-br from-white via-[#fbfaf7] to-[#f4f0ea] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Network className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                AI Aggregator 调度中心
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isUat
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isUat ? 'UAT (ai.onwalk.net)' : 'PROD (ai.svc.plus)'}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              双引擎多渠道 LLM 聚合调度网关与 Token 配额分析系统（New API + CPA + CodeAgent）。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
            >
              进入管理控制台
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 状态与指标卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[1.4rem] border border-slate-900/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">执行平面</span>
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-900">
              {isUat ? 'AWS Spot 临时算力 (1h)' : '4C8G 生产长效集群'}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isUat ? 't4g.medium 到期自动 terminate' : '高可用弹性计算节点'}
            </p>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-slate-900/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">双引擎调度</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-900">New API + CPA</div>
            <p className="mt-1 text-xs text-slate-500">边缘路由与 VPS 账号执行隔离</p>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-slate-900/10 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">安全隔离</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-900">tmpfs 凭据销毁</div>
            <p className="mt-1 text-xs text-slate-500">
              {isUat ? 'Vault kv/uat/ 凭据注入' : 'Vault kv/prod/ 凭据隔离'}
            </p>
          </div>
        </div>
      </div>

      {/* API 端点与接入指引 */}
      <section className="rounded-[1.6rem] border border-slate-900/10 bg-white p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900">统一 OpenAI 兼容端点</h2>
        <p className="mt-1 text-sm text-slate-500">
          通过标准兼容端点无缝接入 Cursor、CodeAgent、LangChain 等各类客户端。
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-800">
            {endpointUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
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
    </div>
  )
}
