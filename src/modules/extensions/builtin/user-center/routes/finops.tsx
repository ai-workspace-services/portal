"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Database,
  ExternalLink,
  Gauge,
  Layers3,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";

type ProviderKey = "all" | "aws" | "gcp" | "azure" | "akamai";

interface ProviderCredit {
  id: Exclude<ProviderKey, "all">;
  provider: string;
  account: string;
  total: number;
  used: number;
  daysLeft: number;
  expiry: string;
  focus: string;
  strategy: string;
  color: string;
  tint: string;
}

const PROVIDERS: ProviderCredit[] = [
  {
    id: "gcp",
    provider: "Google Cloud",
    account: "gcp-sandbox-01",
    total: 300,
    used: 106,
    daysLeft: 32,
    expiry: "2026-10-24",
    focus: "GKE / AI / BigQuery",
    strategy: "加速消耗",
    color: "#2563eb",
    tint: "#eff6ff",
  },
  {
    id: "azure",
    provider: "Microsoft Azure",
    account: "azure-devops-01",
    total: 200,
    used: 48,
    daysLeft: 18,
    expiry: "2026-10-14",
    focus: "AKS / OpenAI / DevOps",
    strategy: "实验与学习",
    color: "#0ea5e9",
    tint: "#f0f9ff",
  },
  {
    id: "aws",
    provider: "Amazon Web Services",
    account: "aws-build-01",
    total: 100,
    used: 28,
    daysLeft: 90,
    expiry: "待确认",
    focus: "EC2 / S3 / RDS",
    strategy: "核心实验",
    color: "#f97316",
    tint: "#fff7ed",
  },
  {
    id: "akamai",
    provider: "Akamai Cloud",
    account: "akamai-edge-01",
    total: 100,
    used: 32,
    daysLeft: 70,
    expiry: "2026-12-01",
    focus: "AI Gateway / DB / VPS",
    strategy: "稳定工作负载",
    color: "#0f9f8c",
    tint: "#f0fdfa",
  },
];

const BURN_DATA = [
  { date: "Sep 22", required: 7.5, actual: 3.4 },
  { date: "Sep 29", required: 7.4, actual: 4.1 },
  { date: "Oct 06", required: 7.6, actual: 4.8 },
  { date: "Oct 13", required: 7.1, actual: 5.3 },
  { date: "Oct 20", required: 7.3, actual: 5.9 },
  { date: "Oct 27", required: 7.5, actual: 6.7 },
];

const NAMESPACES = [
  { name: "ai-workspace", cost: "$842", share: 42, width: "42%" },
  { name: "global-mesh", cost: "$401", share: 20, width: "20%" },
  { name: "xconnect", cost: "$281", share: 14, width: "14%" },
  { name: "observability", cost: "$201", share: 10, width: "10%" },
  { name: "shared-services", cost: "$142", share: 7, width: "7%" },
];

const ACTIONS = [
  {
    id: "gcp-burn",
    title: "把 AI 批处理迁移到 GCP 赠金池",
    description:
      "GKE 的 3 个非生产 Job 可优先使用剩余额度，避免 10 月 24 日到期浪费。",
    impact: "预计保护 $124",
    tone: "critical",
  },
  {
    id: "azure-rightsize",
    title: "缩减 Azure Dev 节点池",
    description: "当前 CPU P95 为 28%，建议从 3 个节点调整为 2 个。",
    impact: "预计节省 $78 / 月",
    tone: "normal",
  },
  {
    id: "aws-free-tier",
    title: "启用 AWS Free Tier 策略",
    description: "将测试环境对象存储切换至免费额度优先的生命周期策略。",
    impact: "保护 30+ 项免费服务",
    tone: "normal",
  },
];

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FinOpsRoute() {
  const [providerFilter, setProviderFilter] = useState<ProviderKey>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredProviders = useMemo(
    () =>
      providerFilter === "all"
        ? PROVIDERS
        : PROVIDERS.filter((provider) => provider.id === providerFilter),
    [providerFilter],
  );

  const totalCredit = filteredProviders.reduce(
    (sum, provider) => sum + provider.total,
    0,
  );
  const usedCredit = filteredProviders.reduce(
    (sum, provider) => sum + provider.used,
    0,
  );
  const remainingCredit = totalCredit - usedCredit;
  const utilization =
    totalCredit === 0 ? 0 : Math.round((usedCredit / totalCredit) * 100);

  const refresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 650);
  };

  return (
    <div className="space-y-5 pb-2">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-subtle)]">
            <Link href="/panel" className="hover:text-[var(--color-text)]">
              控制台
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>FinOps</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              Cloud Credit Portfolio
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              额度优先策略已启用
            </span>
          </div>
          <p className="mt-1.5 max-w-3xl text-sm text-[var(--color-text-subtle)]">
            汇集多云账单、赠金与 OpenCost
            分摊；在产生付费前，优先把可用额度转化为可验证的工程价值。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="finops-provider">
            云厂商筛选
          </label>
          <select
            id="finops-provider"
            value={providerFilter}
            onChange={(event) =>
              setProviderFilter(event.target.value as ProviderKey)
            }
            className="h-9 rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-primary/25"
          >
            <option value="all">全部云厂商</option>
            {PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.provider}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refresh}
            className="tactile-button tactile-button-soft inline-flex h-9 items-center gap-2 px-3 text-sm font-medium"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            同步采集
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-emerald-800/30 bg-[linear-gradient(110deg,#09352f,#0d493e_58%,#105546)] px-5 py-5 text-white shadow-[var(--shadow-soft)] sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200 ring-1 ring-emerald-200/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-100">
                Credit-first guardrail
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                每一笔可预见成本，先匹配赠金与免费额度
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-50/80">
                规则引擎已覆盖 {filteredProviders.length}{" "}
                个连接账户；检测到额度即将到期或闲置时，会按工作负载、团队和命名空间生成行动建议。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-emerald-100/20 rounded-xl border border-emerald-100/15 bg-black/10">
            <div className="min-w-[112px] px-4 py-2.5">
              <div className="text-2xl font-semibold">
                {usd(remainingCredit)}
              </div>
              <div className="mt-1 text-xs text-emerald-100/70">可用额度</div>
            </div>
            <div className="min-w-[112px] px-4 py-2.5">
              <div className="text-2xl font-semibold">{utilization}%</div>
              <div className="mt-1 text-xs text-emerald-100/70">额度已使用</div>
            </div>
            <div className="min-w-[112px] px-4 py-2.5">
              <div className="text-2xl font-semibold">3</div>
              <div className="mt-1 text-xs text-emerald-100/70">待处理行动</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              额度组合
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
              额度、到期窗口与最优使用策略
            </p>
          </div>
          <span className="text-xs text-[var(--color-text-subtle)]">
            上次采集：刚刚
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProviders.map((provider) => {
            const remaining = provider.total - provider.used;
            const rate = Math.round((provider.used / provider.total) * 100);
            return (
              <article
                key={provider.id}
                className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: provider.tint,
                        color: provider.color,
                      }}
                    >
                      <Cloud className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-text)]">
                        {provider.provider}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-subtle)]">
                        {provider.account}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${provider.daysLeft <= 30 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                  >
                    {provider.daysLeft} 天
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                      {usd(remaining)}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                      剩余额度 / {usd(provider.total)}
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: provider.color }}
                  >
                    {rate}% 已用
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${rate}%`,
                      backgroundColor: provider.color,
                    }}
                  />
                </div>
                <dl className="mt-4 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-text-subtle)]">到期</dt>
                    <dd className="font-medium text-[var(--color-text)]">
                      {provider.expiry}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-text-subtle)]">
                      优先工作负载
                    </dt>
                    <dd className="text-right font-medium text-[var(--color-text)]">
                      {provider.focus}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-text-subtle)]">策略</dt>
                    <dd
                      className="font-medium"
                      style={{ color: provider.color }}
                    >
                      {provider.strategy}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.75fr)]">
        <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                赠金额度消耗节奏
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                实际消耗需追上“到期前充分利用”的建议消耗线
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Gauge className="h-3.5 w-3.5" />
              本周期
            </span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={BURN_DATA}
                margin={{ top: 6, right: 12, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="actualBurn" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f9f8c" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#0f9f8c"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    `$${Number(value).toFixed(1)}/day`,
                    "",
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="required"
                  name="建议消耗"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="实际消耗"
                  stroke="#0f9f8c"
                  strokeWidth={2.5}
                  fill="url(#actualBurn)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <aside className="rounded-xl border border-lime-200 bg-lime-50/70 p-5 shadow-[var(--shadow-sm)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-200 text-lime-800">
            <Rocket className="h-4.5 w-4.5" />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-lime-800">
            优先行动
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">
            3 项行动可保护 $202 的额度价值
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            先处理即将到期且当前消耗不足的额度，再处理持续性成本优化。
          </p>
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime-500 px-4 py-2.5 text-sm font-semibold text-lime-950 transition hover:bg-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-600 focus:ring-offset-2"
          >
            查看 3 项行动 <ArrowRight className="h-4 w-4" />
          </button>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                OpenCost 分摊
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                按 Kubernetes 命名空间归集的近 30 日可分摊成本
              </p>
            </div>
            <Layers3 className="h-5 w-5 text-[var(--color-text-subtle)]" />
          </div>
          <div className="px-5 py-2">
            {NAMESPACES.map((namespace) => (
              <div
                key={namespace.name}
                className="grid grid-cols-[minmax(120px,1fr)_68px_1.4fr_36px] items-center gap-3 border-b border-slate-100 py-3 last:border-0"
              >
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {namespace.name}
                </span>
                <span className="text-right text-sm font-semibold text-[var(--color-text)]">
                  {namespace.cost}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: namespace.width }}
                  />
                </div>
                <span className="text-right text-xs text-[var(--color-text-subtle)]">
                  {namespace.share}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[color:var(--color-surface-border)] bg-slate-50/70 px-5 py-3 text-xs">
            <span className="text-[var(--color-text-subtle)]">
              采集器状态：4/4 云账户 · 2/2 集群
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              查看成本归集 <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                FinOps 决策链
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                从采集到账单价值的闭环
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <div className="grid grid-cols-4 gap-0 p-4 text-center">
            {[
              [WalletCards, "采集", "账单、额度、用量"],
              [Database, "分析", "到期与浪费风险"],
              [Layers3, "分配", "工作负载到云"],
              [Rocket, "执行", "策略与优化建议"],
            ].map(([Icon, label, detail], index) => {
              const StepIcon = Icon as typeof WalletCards;
              return (
                <div key={label as string} className="relative px-2">
                  <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-primary">
                    <StepIcon className="h-4 w-4" />
                  </span>
                  {index < 3 ? (
                    <ArrowRight className="absolute right-[-7px] top-2.5 h-4 w-4 text-slate-300" />
                  ) : null}
                  <div className="mt-2 text-xs font-semibold text-[var(--color-text)]">
                    {label as string}
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-[var(--color-text-subtle)]">
                    {detail as string}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {showDetails ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finops-actions-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2
                  id="finops-actions-title"
                  className="text-lg font-semibold text-slate-950"
                >
                  待执行的 FinOps 行动
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  按额度到期风险与预期价值排序
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="关闭行动列表"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 px-5 py-4">
              {ACTIONS.map((action, index) => (
                <article
                  key={action.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${action.tone === "critical" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="font-semibold text-slate-900">
                          {action.title}
                        </h3>
                        <span className="text-xs font-semibold text-emerald-700">
                          {action.impact}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        {action.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedAction(action.id)}
                        className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${selectedAction === action.id ? "text-emerald-700" : "text-primary hover:underline"}`}
                      >
                        {selectedAction === action.id ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            已加入执行队列
                          </>
                        ) : (
                          <>
                            加入执行队列 <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="flex justify-end border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
