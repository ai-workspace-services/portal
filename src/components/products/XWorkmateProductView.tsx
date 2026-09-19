"use client";

import Image from "next/image";
import BoundaryLink from "@/components/common/BoundaryLink";
import {
  AppWindow,
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  Cpu,
  Download,
  FolderArchive,
  GitBranch,
  Layers,
  Monitor,
  Network,
  PlayCircle,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";
import { Github } from "@/components/icons/brand";
import MarketingNav from "@/components/marketing/MarketingNav";
import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import ProductSourceLinks from "@/components/products/ProductSourceLinks";
import { useLanguage } from "@/i18n/LanguageProvider";
import { COMPANY_LEGAL_NAME } from "@/lib/company";

export default function XWorkmateProductView() {
  const { language } = useLanguage();
  const isChinese = language === "zh";

  const problems = [
    {
      icon: ShieldAlert,
      title: isChinese ? "模型割裂与频繁切换" : "Fragmented Model Silos",
      desc: isChinese
        ? "在 ChatGPT、Claude、Gemini 以及各类本地开源模型之间反复横跳，无法统一调度，上下文与账单全面碎片化。"
        : "Constantly jumping between ChatGPT, Claude, Gemini, and local weights with zero unified context or centralized governance.",
    },
    {
      icon: Workflow,
      title: isChinese ? "无状态对话，长任务易断线" : "Stateless Chat & Broken Workflows",
      desc: isChinese
        ? "常规 AI 对话聊天即走，复杂工程长任务无法持久保存上下文、无法断点恢复，更无法自动组织产物落盘。"
        : "Conventional chat interfaces forget sessions quickly. Multi-step tasks break mid-run without durable checkpointing or file outputs.",
    },
    {
      icon: Network,
      title: isChinese ? "工具链与真实环境孤立" : "Isolated from Runtimes & Data",
      desc: isChinese
        ? "大模型无法安全触达本地代码库、开发工具和私有 API，停留在聊天建议，无法执行真实业务生产作业。"
        : "Prompts cannot safely interface with your local disk, project repositories, or private services to perform real production work.",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      icon: AppWindow,
      title: isChinese ? "统一客户端发起任务" : "Initiate in Unified Workspace",
      desc: isChinese
        ? "从 XWorkmate App（或 Web 端）创建工作区，绑定本地/远程项目目录，维护持久任务线程。"
        : "Start projects in XWorkmate App or Web client with persistent task threads and local file bindings.",
    },
    {
      step: "02",
      icon: ServerCog,
      title: isChinese ? "Bridge 运行时安全转发" : "Bridge Secure Execution Contract",
      desc: isChinese
        ? "由 XWorkmate Bridge 守护进程管理安全认证、端点转发与多智能体会话调度，不泄露本地敏感状态。"
        : "XWorkmate Bridge securely orchestrates authenticated RPCs, multi-agent sessions, and runtime states.",
    },
    {
      step: "03",
      icon: GitBranch,
      title: isChinese ? "OpenClaw 智能体会话协作" : "OpenClaw Multi-Session Execution",
      desc: isChinese
        ? "将复杂目标拆解为多个自主 Agent 线程，并行调用写作、编程、多模态技能包与调试工具。"
        : "Autonomous agents run concurrently across threads, executing specialized skills, scripts, and unit tests.",
    },
    {
      step: "04",
      icon: FolderArchive,
      title: isChinese ? "结构化成果沉淀与实时预览" : "Artifact Delivery & Live Preview",
      desc: isChinese
        ? "代码、文档、设计方案与多模态资产直接落入工作区，支持实时热预览、差异比对与版本追踪。"
        : "Source code, reports, and digital assets land directly in your workspace with live previews and versioning.",
    },
  ];

  const availability = [
    {
      os: isChinese ? "macOS 桌面客户端" : "macOS Desktop Client",
      badge: ".dmg",
      status: isChinese ? "已就绪 · 推荐体验" : "Ready · Recommended",
      action: isChinese ? "前往下载" : "Download",
      href: "#source-and-downloads",
    },
    {
      os: isChinese ? "Windows 桌面客户端" : "Windows Desktop Client",
      badge: "x64 · .zip",
      status: isChinese ? "已就绪" : "Ready",
      action: isChinese ? "前往下载" : "Download",
      href: "#source-and-downloads",
    },
    {
      os: isChinese ? "Linux 客户端" : "Linux Client",
      badge: ".deb / .rpm",
      status: isChinese ? "已就绪" : "Ready",
      action: isChinese ? "前往下载" : "Download",
      href: "#source-and-downloads",
    },
    {
      os: isChinese ? "Android 客户端" : "Android Client",
      badge: "arm64 · .apk",
      status: isChinese ? "已发布" : "Released",
      action: isChinese ? "前往下载" : "Download",
      href: "#source-and-downloads",
    },
    {
      os: isChinese ? "Web 在线工作空间" : "Web Cloud Workspace",
      badge: "Modern Browser",
      status: isChinese ? "开箱即用 · 免安装" : "Instant Access · Zero Install",
      action: isChinese ? "开始免费试用" : "Start Free",
      href: "/ai-workspace?entry=trial",
    },
  ];

  return (
    <div className="xds" style={{ minHeight: "100vh", overflowX: "hidden", backgroundColor: "var(--color-surface-base, #fff)" }}>
      <MarketingNav />

      <main style={{ paddingTop: 32 }}>
        {/* SECTION 1: HERO */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {isChinese ? "统一 AI 工作空间 · 由 XWork Technologies LLC 打造" : "Unified AI Workspace · Built by XWork Technologies LLC"}
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
                XWorkmate
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-xl text-slate-600 dark:text-slate-300">
                {isChinese
                  ? "连接模型、智能体、工具与数据，让 AI 真正参与生产交付，而不是停留在无状态的对话中。"
                  : "Connect models, autonomous agents, tools, and data so AI executes real-world work instead of stopping at stateless chat."}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <BoundaryLink
                  href="/ai-workspace?entry=trial"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-primary/90"
                >
                  <PlayCircle className="h-5 w-5" />
                  {isChinese ? "开始免费体验" : "Start Free Trial"}
                  <ArrowRight className="h-4 w-4" />
                </BoundaryLink>
                <a
                  href="#source-and-downloads"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-5 w-5" />
                  {isChinese ? "下载客户端 / 源码" : "Download App / Repos"}
                </a>
              </div>
            </div>

            {/* HERO IMAGE SHOWCASE */}
            <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900/5 p-2 shadow-2xl dark:border-slate-800">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-950">
                <Image
                  src="/marketing/xworkmate-suite-hero.png"
                  alt="XWorkmate Workspace Overview"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: WHAT IT IS */}
        <section className="border-y border-slate-100 bg-slate-50/50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                {isChinese ? "产品定义" : "What It Is"}
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {isChinese ? "什么是 XWorkmate？" : "What is XWorkmate?"}
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                {isChinese
                  ? "XWorkmate 是由 XWork Technologies LLC 研发的企业与开发者级 AI 工作空间。它不再将 AI 限制为单一的网页聊天框，而是提供具备持久记忆、任务线程、工具插件接入与本地运行环境桥接的完整数字工坊，让 AI 真正自主协同并产出结构化业务成果。"
                  : "XWorkmate is a next-generation AI workspace engineered by XWork Technologies LLC. Rather than confining intelligence to a fleeting chat tab, it supplies persistent memory, task threads, tool plugins, and local daemon bridging—transforming AI into an active partner delivering tangible code, documents, and workflows."}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE PROBLEM */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                {isChinese ? "解决的痛点" : "The Core Problem"}
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {isChinese ? "解决传统 AI 工具的 3 大核心瓶颈" : "Overcoming 3 Fundamental AI Bottlenecks"}
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {problems.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div
                    key={idx}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW IT WORKS */}
        <section className="border-y border-slate-100 bg-slate-50/50 py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                {isChinese ? "技术与协同链路" : "Architecture & Workflow"}
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {isChinese ? "XWorkmate 是如何工作的？" : "How XWorkmate Works"}
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
                {isChinese
                  ? "从客户端指令发起，到 Bridge 桥接、多 Agent 并行会话，最终成果自动落盘。"
                  : "From client dispatch to daemon bridge, autonomous agent execution, and persistent artifact delivery."}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xl font-black text-slate-300 dark:text-slate-700">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 5: SCREENSHOTS SHOWCASE */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                {isChinese ? "产品界面" : "Product Overview"}
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {isChinese ? "产品界面与工作流预览" : "Workspace and Workflow Overview"}
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-[4/3] w-full bg-slate-950">
                  <Image
                    src="/marketing/xworkmate/已生成图像 1.png"
                    alt="Task Execution & Multi-Agent Collaboration"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {isChinese ? "智能代理矩阵协同" : "Multi-Agent Orchestration"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {isChinese
                      ? "多线程自主调度，实时查看各个 Agent 的执行步骤与上下文状态。"
                      : "Parallel agent execution with transparent context inspection and step monitoring."}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-[4/3] w-full bg-slate-950">
                  <Image
                    src="/marketing/xworkmate/已生成图像 2.png"
                    alt="Model Routing & Gateway Dispatch"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {isChinese ? "动态模型路由与分流" : "Dynamic Model Routing"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {isChinese
                      ? "LiteLLM 原生集成，按需无缝切换不同厂商大模型，兼顾性能与成本。"
                      : "Native model switching via LiteLLM proxies, balancing latency, throughput, and token budget."}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-[4/3] w-full bg-slate-950">
                  <Image
                    src="/marketing/xworkmate/已生成图像 3.png"
                    alt="Full Observability & Output Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {isChinese ? "全息可观测与产物看板" : "Holographic Observability"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {isChinese
                      ? "所有请求拓扑、Token 开销与产物文件集中归档展示，所见即所得。"
                      : "Centralized topology view, resource metrics, and real-time artifact previews."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: CURRENT AVAILABILITY */}
        <section className="border-y border-slate-100 bg-slate-50/50 py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                {isChinese ? "支持平台" : "Current Availability"}
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {isChinese ? "跨平台支持与交付形态" : "Deploy Anywhere: Desktop, Mobile & Web"}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {availability.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.badge}
                    </span>
                    <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                      {item.os}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ {item.status}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {item.href.startsWith("/") ? (
                      <BoundaryLink
                        href={item.href}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary/10 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
                      >
                        {item.action}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </BoundaryLink>
                    ) : (
                      <a
                        href={item.href}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        {item.action}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7: OPEN SOURCE REPOS & DOWNLOADS */}
        <ProductSourceLinks slug="xworkmate" language={language} />

        {/* SECTION 8: GET STARTED CTA */}
        <section id="get-started" className="py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-white to-primary/5 p-8 shadow-sm dark:from-primary/10 dark:via-slate-900 dark:to-primary/10 sm:p-12">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {isChinese ? "立即开启智能工作空间" : "Get Started with XWorkmate Today"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                {isChinese
                  ? "由 XWork Technologies LLC 持续开发与维护。无需复杂部署，一键开启免费在线体验或下载原生桌面端。"
                  : "Engineered and operated by XWork Technologies LLC. Start free in your browser or install the native client."}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <BoundaryLink
                  href="/ai-workspace?entry=trial"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-primary/90"
                >
                  <PlayCircle className="h-5 w-5" />
                  {isChinese ? "进入在线工作空间" : "Launch Online Workspace"}
                </BoundaryLink>
                <BoundaryLink
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {isChinese ? "企业与私有化咨询" : "Enterprise Inquiry"}
                </BoundaryLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <XdsSiteFooter />
    </div>
  );
}
