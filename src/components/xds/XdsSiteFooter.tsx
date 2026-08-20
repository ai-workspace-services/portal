"use client";

/**
 * 站点页脚（xds 版）—— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 产品页专用：整幅站点地图式页脚，取代原先夹在 max-w-6xl 容器里的
 * Tailwind 工具条，让页面从 hero 到页脚都在 xds 作用域内。
 * 链接沿用站点既有路由，不新增内容源。
 */

import BoundaryLink from "@/components/common/BoundaryLink";
import { Zap } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";

type FooterColumn = {
  title: string;
  items: Array<{ label: string; href: string }>;
};

const COLUMNS: Record<"zh" | "en", FooterColumn[]> = {
  zh: [
    {
      title: "产品",
      items: [
        { label: "XConnect", href: "/products/xconnect" },
        { label: "XWorkmate", href: "/products/xworkmate" },
        { label: "AI Workspace", href: "/products/ai-workspace" },
        { label: "开放平台", href: "/products/open-platform" },
      ],
    },
    {
      title: "资源",
      items: [
        { label: "下载", href: "/download" },
        { label: "定价", href: "/prices" },
        { label: "帮助与支持", href: "/support" },
      ],
    },
    {
      title: "账户",
      items: [
        { label: "用户中心", href: "/panel" },
        { label: "订阅与配额", href: "/panel/subscription" },
        { label: "账单", href: "/panel/billing" },
        { label: "安全设置", href: "/panel/account" },
      ],
    },
    {
      title: "公司",
      items: [
        { label: "关于", href: "/about" },
        { label: "联系我们", href: "/support" },
        { label: "隐私政策", href: "/privacy" },
        { label: "服务条款", href: "/terms" },
      ],
    },
  ],
  en: [
    {
      title: "Products",
      items: [
        { label: "XConnect", href: "/products/xconnect" },
        { label: "XWorkmate", href: "/products/xworkmate" },
        { label: "AI Workspace", href: "/products/ai-workspace" },
        { label: "Open platform", href: "/products/open-platform" },
      ],
    },
    {
      title: "Resources",
      items: [
        { label: "Download", href: "/download" },
        { label: "Pricing", href: "/prices" },
        { label: "Help & support", href: "/support" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "User center", href: "/panel" },
        { label: "Subscription", href: "/panel/subscription" },
        { label: "Billing", href: "/panel/billing" },
        { label: "Security", href: "/panel/account" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/support" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ],
};

const TAGLINE = {
  zh: "AI Connectivity · 为 AI Workspace 提供全球连接能力、私有环境穿透与统一的产品入口。",
  en: "AI connectivity, private-environment tunneling, and one entry point for every AI Workspace product.",
};

interface XdsSiteFooterProps {
  brand?: string;
}

export default function XdsSiteFooter({ brand = "XWorkmate" }: XdsSiteFooterProps) {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "zh";

  return (
    <footer className="xds-footer">
      <div className="xds-container">
        <div className="xds-footer-grid">
          <div>
            <BoundaryLink className="xds-logo" href="/">
              <span className="xds-logo-mark">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {brand}
            </BoundaryLink>
            <p
              className="xds-t-caption"
              style={{ marginTop: "var(--sp-3)", maxWidth: "26ch" }}
            >
              {TAGLINE[lang]}
            </p>
          </div>

          {COLUMNS[lang].map((column) => (
            <div key={column.title}>
              <h5>{column.title}</h5>
              <ul>
                {column.items.map((item) => (
                  <li key={item.href + item.label}>
                    <BoundaryLink href={item.href}>{item.label}</BoundaryLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="xds-divider"
          style={{ margin: "var(--sp-8) 0 var(--sp-5)" }}
        />
        <div className="xds-row-between">
          <span className="xds-t-caption">
            © {new Date().getFullYear()} onwalk.net
          </span>
        </div>
      </div>
    </footer>
  );
}
