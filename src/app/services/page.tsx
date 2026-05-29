"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookText,
  Bot,
  Box,
  CloudCog,
  Command,
  Database,
  FileEdit,
  Gauge,
  type LucideIcon,
  MessageCircle,
  Network,
} from "lucide-react";

import {
  PublicPageIntro,
  PublicPageShell,
} from "@/components/public/PublicPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

const placeholderCount = 1;

type ServiceCardData = {
  key: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

function ServiceCard({
  service,
  isChinese,
}: {
  service: ServiceCardData;
  isChinese: boolean;
}) {
  const content = (
    <div className="group flex h-full flex-col justify-between rounded-[1.6rem] border border-slate-900/10 bg-[#fcfbf8] p-5 transition duration-200 hover:-translate-y-[1px] hover:bg-white">
      <div className="space-y-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/[0.04] text-primary">
          <service.icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-[1.02rem] font-semibold leading-7 tracking-[-0.03em] text-slate-900">
            {service.name}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {service.description}
          </p>
        </div>
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary transition group-hover:text-primary-hover">
        {isChinese ? "打开" : "Open"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </div>
  );

  if (service.external) {
    return (
      <a
        href={service.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={service.href} className="block">
      {content}
    </Link>
  );
}

function PlaceholderCard({ isChinese }: { isChinese: boolean }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-[1.6rem] border border-dashed border-slate-900/12 bg-white/70 p-5">
      <div className="space-y-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-slate-900/12 text-slate-400">
          <Box className="h-4 w-4" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-[1.02rem] font-semibold leading-7 tracking-[-0.03em] text-slate-800">
            {isChinese ? "更多服务即将上线" : "More services coming soon"}
          </h2>
          <p className="text-sm leading-6 text-slate-500">
            {isChinese
              ? "预留卡片位置，持续扩充入口。"
              : "Reserved slots for new service entries."}
          </p>
        </div>
      </div>
      <span className="mt-6 text-sm font-semibold text-slate-500">
        {isChinese ? "敬请期待" : "Stay tuned"}
      </span>
    </div>
  );
}

export default function ServicesPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";

  const services: ServiceCardData[] = [
    {
      key: "editor",
      name: isChinese ? "编辑器" : "Editor",
      description: isChinese
        ? "Markdown 发布与排版的在线编辑器。"
        : "Markdown publishing and layout editor.",
      href: "https://markdown-publisher.svc.plus",
      icon: FileEdit,
      external: true,
    },
    {
      key: "wechat-to-markdown",
      name: isChinese ? "微信转 Markdown" : "WeChat to Markdown",
      description: isChinese
        ? "一键将公众号内容转换为 Markdown。"
        : "Convert WeChat articles into Markdown.",
      href: "https://wechat-to-markdown.svc.plus",
      icon: MessageCircle,
      external: true,
    },
    {
      key: "page-reading",
      name: isChinese ? "Page Reading Agent" : "Page Reading Agent",
      description: isChinese
        ? "智能网页阅读与分析服务。"
        : "Intelligent web page reading and analysis service.",
      href: "https://page-reading.svc.plus",
      icon: Bot,
      external: true,
    },
    {
      key: "artifact",
      name: isChinese ? "制品 / 镜像" : "Artifact / Mirror",
      description: isChinese
        ? "获取核心制品、镜像与下载资源。"
        : "Get core artifacts, mirrors, and downloads.",
      href: "/download",
      icon: Box,
    },
    {
      key: "cloudIac",
      name: isChinese ? "云 IaC 目录" : "Cloud IaC Catalog",
      description: isChinese
        ? "浏览云基础设施目录与自动化蓝图。"
        : "Browse cloud IaC catalog and automation blueprints.",
      href: "/cloud_iac",
      icon: CloudCog,
    },
    {
      key: "insight",
      name: isChinese ? "监控与观测" : "Monitoring & Observability",
      description: isChinese
        ? "基础设施、数据库与应用系统的全栈可观测性工作台。"
        : "Full-stack observability workbench for infrastructure, databases, and apps.",
      href: "https://observability.svc.plus/grafana/",
      icon: Gauge,
      external: true,
    },
    {
      key: "ai-gateway",
      name: isChinese ? "AI 网关" : "AI Gateway",
      description: isChinese
        ? "Litellm 驱动的 LLM API 统一管理与路由。"
        : "Unified LLM API management and routing powered by Litellm.",
      href: "https://ai-gateway.svc.plus",
      icon: Network,
      external: true,
    },
    {
      key: "docs",
      name: isChinese ? "文档 / 解决方案" : "Docs / Solutions",
      description: isChinese
        ? "阅读文档、方案与产品指南。"
        : "Read documentation, solutions, and guides.",
      href: "/docs",
      icon: BookText,
    },
    {
      key: "x-scope-hub",
      name: isChinese ? "XScopeHub MCP" : "XScopeHub MCP",
      description: isChinese
        ? "模块化 MCP 服务驱动的可观测性中心。"
        : "Modular MCP server powering observability hub.",
      href: "https://x-scope-hub-svc-plus-266500572462.asia-northeast1.run.app",
      icon: Database,
      external: true,
    },
    {
      key: "x-cloud-flow",
      name: isChinese ? "XCloudFlow" : "XCloudFlow",
      description: isChinese
        ? "多云基础设施、配置编排与边缘执行流水线。"
        : "Multi-cloud infrastructure and edge execution flow.",
      href: "https://x-cloud-flow-svc-plus-266500572462.asia-northeast1.run.app",
      icon: Network,
      external: true,
    },
    {
      key: "xworkmate",
      name: "XWorkmate",
      description: isChinese
        ? "在线版 XWorkmate 工作区，底层由 xworkmate-bridge 驱动。"
        : "Online XWorkmate workspace powered by xworkmate-bridge.",
      href: "/xworkmate",
      icon: Command,
    },
  ];

  return (
    <PublicPageShell>
      <section className="rounded-[2.4rem] border border-slate-900/10 bg-[linear-gradient(180deg,#ffffff,#faf7f2)] p-6 shadow-[0_22px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <PublicPageIntro
            eyebrow={isChinese ? "更多服务" : "More services"}
            title={
              isChinese ? "扩展服务与工具箱" : "Extended Services & Toolbox"
            }
            subtitle={
              isChinese
                ? "把开发辅助、运维观测与核心资源整理成一组统一入口，延续首页同一套公开页语法。"
                : "A unified set of entry points for development tools, observability, and core resources, using the same public-page language as the homepage."
            }
            titleClassName={cn(
              isChinese
                ? "text-[2.7rem] tracking-[-0.08em] sm:text-[3.4rem]"
                : "editorial-display text-[2.9rem] tracking-[-0.06em] sm:text-[3.6rem]",
            )}
          />

          <div className="grid gap-3 rounded-[1.75rem] border border-slate-900/10 bg-white/85 p-5 sm:min-w-[18rem]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {isChinese ? "页面原则" : "Page rhythm"}
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {isChinese
                ? "保持结构不变，但去掉 classic / material 的风格分裂。"
                : "Keep the structure, remove the classic/material visual split."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-900/10 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:p-7">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
              {isChinese ? "服务目录" : "Service directory"}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {isChinese
                ? "每个入口都使用同一种卡片语法：白底、细边框、轻阴影、明确标题。"
                : "Every entry now follows the same card grammar: pale surface, fine border, light shadow, and clear hierarchy."}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-slate-900/10 bg-[#f8f4ec] px-3 py-1 text-xs font-semibold text-slate-700">
            {services.length} {isChinese ? "个入口" : "entries"}
          </span>
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((service) => (
            <ServiceCard
              key={service.key}
              service={service}
              isChinese={isChinese}
            />
          ))}
          {Array.from({ length: placeholderCount }).map((_, index) => (
            <PlaceholderCard
              key={`placeholder-${index}`}
              isChinese={isChinese}
            />
          ))}
        </section>
      </section>
    </PublicPageShell>
  );
}
