"use client";

/**
 * XConnect 产品主页 —— Micro SaaS 模版第 1 页
 *
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版/01-product-home.html
 *
 * 结构上的核心变化：把「3 步开启」做成转化主干而不是装饰性图文，
 * 每步给出时长预期和结果预览，区块末尾只留一个 primary 按钮。
 * 导航与页脚用 xds 版站点组件，整页都在 .xds 作用域内。
 */

import BoundaryLink from "@/components/common/BoundaryLink";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  Globe,
  Info,
  Layers,
  Lock,
  Monitor,
  Network,
  QrCode,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import MarketingNav from "@/components/marketing/MarketingNav";
import {
  XdsBadge,
  XdsCard,
  XdsCardFoot,
  XdsEyebrow,
  XdsLinkButton,
  XdsSectionHead,
} from "@/components/ui/xds";
import { useLanguage } from "@/i18n/LanguageProvider";
import {
  formatPlanPrice,
  PLAN_COPY,
  useBillingCatalog,
} from "@modules/billing/catalog";
import ProductShotFrame from "@/components/products/ProductShotFrame";
import xconnectContent from "@/data/content/xconnect.json";

type Lang = "zh" | "en";

/**
 * A pricing card on the product page.
 *
 * A card that sells a catalog plan carries `planId` and nothing else about
 * money: the amount comes from the live catalog and the feature bullets from
 * PLAN_COPY, so this page and /prices cannot quote different numbers for the
 * same plan. Cards with no catalog row behind them -- the free tier and the
 * custom tier -- supply their own `amt` and `feats`.
 */
type ProductPlan = {
  name: string;
  tag: string;
  tone: "neutral" | "info";
  sub: string;
  per: string;
  cta: string;
  href: string;
  primary: boolean;
  amt?: string;
  feats?: string[];
  planId?: keyof typeof PLAN_COPY;
  /** Rendered as a secondary line under the headline price. */
  yearlyPlanId?: keyof typeof PLAN_COPY;
};

const COPY = {
  zh: {
    heroTitle: ["为 AI Workspace 而生的", "全球连接层"],
    heroSub:
      "XConnect 提供高速、稳定、安全的全球连接能力与私有环境穿透。3 分钟完成部署，打通本地开发环境与全球 AI 节点。",
    ctaDownload: "立即下载客户端",
    ctaConsole: "进入控制台",
    trust: [
      { v: "32", k: "全球接入节点" },
      { v: "99.95", unit: "%", k: "近 90 天可用性" },
      { v: "<40", unit: "ms", k: "区域内中位延迟" },
      { v: "VLESS", k: "标准协议 · 客户端自由" },
    ],
    wizardEyebrow: "Get started",
    wizardTitle: "3 步开启安全加速连接",
    wizardLead:
      "无需理解协议细节。注册后控制台会按顺序引导你完成每一步，并实时回显服务端状态。",
    steps: [
      {
        cost: "1 分钟",
        title: "注册并完善账户安全",
        desc: "邮箱验证 + 绑定 MFA。安全等级达标后才会开放计费与订阅操作，避免账号被盗刷。",
      },
      {
        cost: "30 秒",
        title: "获取 VLESS 连接凭据",
        desc: "控制台一键生成二维码或订阅链接，导入任意支持 VLESS 的客户端，无需手工填写节点参数。",
      },
      {
        cost: "即时",
        title: "导入客户端并验证连通",
        desc: "回到控制台确认节点连通状态与实时流量。任何节点异常都会在这里直接标红，不用自己排查。",
      },
    ],
    stepChecks: [
      ["邮箱已验证", "绑定多因素认证"],
      [],
      [],
    ],
    stepAction: "完成安全设置",
    wizardCta: "创建账户，开始第 1 步",
    wizardDocs: "先看完整部署文档",
    previewEyebrow: "Preview",
    previewTitle: "控制台与客户端，装完就是这个样子",
    previewLead:
      "下面三张来自真实界面：控制台总览、节点与凭据面板、客户端主界面。截图未配齐时保留同尺寸占位，版式不变。",
    previewPlaceholder: "界面截图待补充",
    featEyebrow: "Capabilities",
    featTitle: "连接层要解决的六件事",
    feats: [
      {
        icon: Globe,
        t: "全球任播接入",
        d: "32 个区域节点自动择优，跨区访问由骨干网转发，不受单点拥塞影响。",
      },
      {
        icon: Network,
        t: "私有环境穿透",
        d: "把本地开发机、内网 GPU 主机安全暴露给 AI Workspace，无需公网 IP。",
      },
      {
        icon: Lock,
        t: "标准 VLESS 协议",
        d: "不绑定专有客户端。凭据可独立于账户身份轮换，泄露后单独吊销。",
      },
      {
        icon: Activity,
        t: "权威用量计量",
        d: "用量由 accounts 服务端汇总，不以本地客户端计数为准，账单可对账。",
      },
      {
        icon: ShieldCheck,
        t: "MFA 保护计费",
        d: "浏览不受限；发起支付、订阅或账单管理前强制二次验证。",
      },
      {
        icon: Layers,
        t: "策略组与配额",
        d: "按团队成员分配策略组与月度配额，超额自动降级而非直接断连。",
      },
    ],
    dlEyebrow: "Download",
    dlTitle: "选择你的平台",
    dlLead: "当前稳定版 v2.8.1 · 发布于 2026-08-11",
    dlHistory: "历史版本与校验和",
    dlHead: ["平台", "架构", "安装包", "大小"],
    dlRows: [
      { icon: Monitor, p: "macOS 12+", a: "Apple Silicon · Intel", f: "XConnect-2.8.1.dmg", s: "42.6 MB" },
      { icon: Monitor, p: "Windows 10+", a: "x64 · ARM64", f: "XConnect-2.8.1.exe", s: "38.1 MB" },
      { icon: Server, p: "Linux", a: "deb · rpm · AppImage", f: "xconnect_2.8.1_amd64", s: "36.4 MB" },
      { icon: QrCode, p: "iOS / Android", a: "通用", f: "扫码导入订阅链接", s: "—" },
    ],
    dlAction: "下载",
    dlNote:
      "明确不支持鸿蒙 OS。任意支持 VLESS 的第三方客户端均可直接导入订阅链接。",
    priceEyebrow: "Pricing",
    priceTitle: "按量或订阅，统一经 Stripe 结算",
    priceLead:
      "所有套餐共用同一套价格配置，购买后自动同步到订阅记录，可在客户门户自助管理账单。",
    plans: [
      {
        name: "Free",
        tag: "当前",
        tone: "neutral" as const,
        sub: "评估与个人试用",
        amt: "¥0",
        per: " /月",
        feats: ["每月 5 GB 高速流量", "用完自动降级 VPS 流量，不断线", "不承诺 SLA，社区支持"],
        cta: "继续使用",
        href: "/register",
        primary: false,
      },
      {
        // Amount and feature copy come from the live catalog; see planId.
        name: "Pro",
        tag: "推荐",
        tone: "info" as const,
        sub: "个人开发者与小团队",
        planId: "PRO-MONTHLY",
        yearlyPlanId: "PRO-YEARLY",
        per: " /月",
        cta: "升级到 Pro",
        href: "/prices",
        primary: true,
      },
      {
        name: "Team",
        tag: "定制服务",
        tone: "neutral" as const,
        sub: "需要策略组与对账的团队",
        amt: "定制",
        per: "",
        feats: ["策略组与成员配额", "用量导出与发票抬头", "合同级 SLA 与专属交付"],
        cta: "联系我们",
        href: "/support",
        primary: false,
      },
    ] as ProductPlan[],
    faqEyebrow: "FAQ",
    faqTitle: "常见问题",
    faqs: [
      {
        q: "为什么必须绑定 MFA 才能付款？",
        a: "浏览和管理用户中心不受影响。只有发起 Stripe 购买、订阅变更或账单管理这类不可逆操作时才要求二次验证，目的是防止凭据泄露后被恶意扣费。",
      },
      { q: "用量以客户端显示的为准吗？", a: "" },
      { q: "代理 UUID 泄露了怎么办？", a: "" },
      { q: "支持哪些第三方客户端？", a: "" },
      { q: "如何申请退款？", a: "" },
    ],
    finalTitle: "3 分钟，连上全球 AI 节点",
    finalSub: "Free 套餐无需信用卡。注册后控制台会直接把你带到第 1 步。",
    finalCta: "免费创建账户",
    finalDocs: "阅读文档",
    platforms: "macOS · Windows · Linux · iOS · Android",
  },
  en: {
    heroTitle: ["The global connectivity layer", "built for AI Workspace"],
    heroSub:
      "XConnect delivers fast, stable, secure global connectivity and private-environment tunnelling. Three minutes to deploy, linking your local dev machine to AI nodes worldwide.",
    ctaDownload: "Download the client",
    ctaConsole: "Open console",
    trust: [
      { v: "32", k: "Global edge nodes" },
      { v: "99.95", unit: "%", k: "90-day availability" },
      { v: "<40", unit: "ms", k: "Median in-region latency" },
      { v: "VLESS", k: "Open protocol · any client" },
    ],
    wizardEyebrow: "Get started",
    wizardTitle: "Three steps to a secure accelerated link",
    wizardLead:
      "No protocol knowledge required. The console walks you through each step in order and reflects server-side state as it changes.",
    steps: [
      {
        cost: "1 min",
        title: "Sign up and secure the account",
        desc: "Verify email, bind MFA. Billing and subscription actions unlock only once the security bar is met.",
      },
      {
        cost: "30 sec",
        title: "Get your VLESS credentials",
        desc: "Generate a QR code or subscription link in one click and import it into any VLESS-capable client.",
      },
      {
        cost: "Instant",
        title: "Import and verify the link",
        desc: "Come back to confirm node reachability and live traffic. Node faults are flagged here — no manual triage.",
      },
    ],
    stepChecks: [["Email verified", "Bind multi-factor auth"], [], []],
    stepAction: "Finish security setup",
    wizardCta: "Create an account, start step 1",
    wizardDocs: "Read the full deployment guide first",
    previewEyebrow: "Preview",
    previewTitle: "What the console and client actually look like",
    previewLead:
      "Three real screens: console overview, node and credential panel, and the client itself. Slots without a screenshot keep their reserved frame, so the layout never collapses.",
    previewPlaceholder: "Screenshot coming soon",
    featEyebrow: "Capabilities",
    featTitle: "Six things a connectivity layer has to solve",
    feats: [
      { icon: Globe, t: "Global anycast entry", d: "32 regional nodes pick the best path; cross-region traffic rides the backbone." },
      { icon: Network, t: "Private tunnelling", d: "Expose local dev boxes and on-prem GPU hosts to AI Workspace without a public IP." },
      { icon: Lock, t: "Standard VLESS", d: "No proprietary client lock-in. Credentials rotate independently of account identity." },
      { icon: Activity, t: "Authoritative metering", d: "Usage is aggregated server-side by accounts, not by the local client — bills reconcile." },
      { icon: ShieldCheck, t: "MFA-gated billing", d: "Browsing stays open; payment, subscription and billing actions require a second factor." },
      { icon: Layers, t: "Policy groups and quota", d: "Assign policy groups and monthly quota per member; overage degrades instead of cutting off." },
    ],
    dlEyebrow: "Download",
    dlTitle: "Pick your platform",
    dlLead: "Current stable v2.8.1 · released 2026-08-11",
    dlHistory: "Past releases and checksums",
    dlHead: ["Platform", "Architecture", "Package", "Size"],
    dlRows: [
      { icon: Monitor, p: "macOS 12+", a: "Apple Silicon · Intel", f: "XConnect-2.8.1.dmg", s: "42.6 MB" },
      { icon: Monitor, p: "Windows 10+", a: "x64 · ARM64", f: "XConnect-2.8.1.exe", s: "38.1 MB" },
      { icon: Server, p: "Linux", a: "deb · rpm · AppImage", f: "xconnect_2.8.1_amd64", s: "36.4 MB" },
      { icon: QrCode, p: "iOS / Android", a: "Universal", f: "Scan to import subscription", s: "—" },
    ],
    dlAction: "Download",
    dlNote:
      "HarmonyOS is explicitly unsupported. Any third-party VLESS client can import the subscription link directly.",
    priceEyebrow: "Pricing",
    priceTitle: "Metered or subscription, all settled through Stripe",
    priceLead:
      "Every plan maps to the same price configuration; purchases sync to your subscription record and are managed in the customer portal.",
    plans: [
      { name: "Free", tag: "Current", tone: "neutral" as const, sub: "Evaluation and personal use", amt: "¥0", per: " /mo", feats: ["5 GB of accelerated traffic per month", "Seamless fallback to VPS traffic once spent", "No SLA, community support"], cta: "Stay on Free", href: "/register", primary: false },
      { name: "Pro", tag: "Recommended", tone: "info" as const, sub: "Individual devs and small teams", planId: "PRO-MONTHLY", yearlyPlanId: "PRO-YEARLY", per: " /mo", cta: "Upgrade to Pro", href: "/prices", primary: true },
      { name: "Team", tag: "Custom", tone: "neutral" as const, sub: "Teams needing policy groups and reconciliation", amt: "Custom", per: "", feats: ["Policy groups and per-member quota", "Usage export and invoice details", "Contractual SLA and dedicated delivery"], cta: "Talk to us", href: "/support", primary: false },
    ] as ProductPlan[],
    faqEyebrow: "FAQ",
    faqTitle: "Frequently asked",
    faqs: [
      { q: "Why does payment require MFA?", a: "Browsing and managing the user center are unaffected. Only irreversible actions — Stripe purchases, subscription changes, billing management — need a second factor, so a leaked credential cannot be used to charge you." },
      { q: "Is the client's usage figure authoritative?", a: "" },
      { q: "What if my proxy UUID leaks?", a: "" },
      { q: "Which third-party clients work?", a: "" },
      { q: "How do refunds work?", a: "" },
    ],
    finalTitle: "Three minutes to AI nodes worldwide",
    finalSub: "Free needs no credit card. The console takes you straight to step 1.",
    finalCta: "Create a free account",
    finalDocs: "Read the docs",
    platforms: "macOS · Windows · Linux · iOS · Android",
  },
} as const;

export default function XConnectPage() {
  const { language } = useLanguage();
  const lang: Lang = language === "en" ? "en" : "zh";
  const t = COPY[lang];
  const catalog = useBillingCatalog();
  const localized = xconnectContent as unknown as Record<
    string,
    | {
        hero?: { badge?: string };
        showcases?: Array<{ title?: string; image?: string }>;
      }
    | undefined
  >;
  const content = localized[lang] ?? localized.zh;
  const badge = content?.hero?.badge ?? "AI Connectivity";
  // 预览带的图来自内容数据，缺图的位置留占位框而不是塌掉一格
  const shots = (content?.showcases ?? []).slice(0, 3);

  return (
    <div className="xds" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <MarketingNav />

      <main style={{ paddingTop: 24 }}>
        {/* ───────────────── Hero ───────────────── */}
        <section className="xds-hero">
          <div className="xds-container">
            <span className="xds-pill">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              {badge}
            </span>
            <h1 className="xds-t-display-1 xds-hero-title">
              {t.heroTitle[0]}
              <br />
              {t.heroTitle[1]}
            </h1>
            <p className="xds-t-lead xds-hero-sub">{t.heroSub}</p>
            <div className="xds-hero-cta">
              <BoundaryLink href="/download" className="xds-btn xds-btn-primary xds-btn-lg">
                <Download className="h-4 w-4" aria-hidden="true" />
                {t.ctaDownload}
              </BoundaryLink>
              <BoundaryLink href="/panel" className="xds-btn xds-btn-secondary xds-btn-lg">
                {t.ctaConsole}
              </BoundaryLink>
            </div>
            <div className="xds-platform-line">
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.platforms}</span>
            </div>
          </div>
        </section>

        {/* ───────────────── 信任数据条 ───────────────── */}
        <section className="xds-trust">
          <div className="xds-container-wide">
            <div className="xds-trust-grid">
              {t.trust.map((cell) => (
                <div key={cell.k} className="xds-trust-cell">
                  <div className="xds-trust-v">
                    {cell.v}
                    {"unit" in cell && cell.unit ? (
                      <span className="xds-subtle" style={{ fontSize: "var(--fs-body-lg)" }}>
                        {cell.unit}
                      </span>
                    ) : null}
                  </div>
                  <div className="xds-trust-k">{cell.k}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────── 3 步向导（转化主干） ───────────────── */}
        <section className="xds-section" id="wizard">
          <div className="xds-container">
            <XdsSectionHead
              eyebrow={t.wizardEyebrow}
              title={t.wizardTitle}
              lead={t.wizardLead}
            />

            <div
              className="xds-grid xds-wizard"
              style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}
            >
              {t.steps.map((step, i) => (
                <article key={step.title} className="xds-wizard-card">
                  <div className="xds-row-between">
                    <span className="xds-wizard-idx">
                      STEP {String(i + 1).padStart(2, "0")}
                    </span>
                    <XdsBadge tone="info">{step.cost}</XdsBadge>
                  </div>
                  <h3>{step.title}</h3>
                  <p className="xds-t-body-sm xds-muted">{step.desc}</p>

                  <div className="xds-wizard-visual">
                    {i === 0 ? (
                      <>
                        {t.stepChecks[0].map((label, ci) => (
                          <div
                            key={label}
                            className="xds-row"
                            style={{ gap: 8, marginTop: ci === 0 ? 0 : 9 }}
                          >
                            {ci === 0 ? (
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                style={{ color: "var(--success)" }}
                                aria-hidden="true"
                              />
                            ) : (
                              <Circle
                                className="h-3.5 w-3.5 xds-subtle"
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className="xds-t-caption"
                              style={
                                ci === 0 ? { color: "var(--text-primary)" } : undefined
                              }
                            >
                              {label}
                            </span>
                          </div>
                        ))}
                        <div style={{ marginTop: 12 }}>
                          <span className="xds-btn xds-btn-secondary xds-btn-sm">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            {t.stepAction}
                          </span>
                        </div>
                      </>
                    ) : null}

                    {i === 1 ? (
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div
                          className="xds-qr"
                          style={{ width: 78, height: 78, padding: 5, display: "grid", placeItems: "center" }}
                          aria-hidden="true"
                        >
                          <QrCode className="h-10 w-10 xds-subtle" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="xds-t-eyebrow">Subscription</div>
                          <div
                            className="xds-value-box"
                            style={{ marginTop: 6, fontSize: 11 }}
                          >
                            vless://01a0124f…@sg1.xconn.net
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {i === 2 ? (
                      <table className="xds-table" style={{ fontSize: "var(--fs-micro)" }}>
                        <tbody>
                          {[
                            ["sg1 · SG", "success"],
                            ["hk2 · HK", "success"],
                            ["jp1 · JP", "neutral"],
                          ].map(([name, tone]) => (
                            <tr key={name}>
                              <td style={{ padding: "5px 0", border: 0 }}>{name}</td>
                              <td style={{ padding: "5px 0", border: 0, textAlign: "right" }}>
                                <XdsBadge tone={tone as "success" | "neutral"}>
                                  {tone === "success"
                                    ? lang === "zh" ? "已连通" : "Linked"
                                    : lang === "zh" ? "待验证" : "Pending"}
                                </XdsBadge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {/* 区块内唯一 primary */}
            <div className="xds-row" style={{ marginTop: 24, gap: 12 }}>
              <BoundaryLink href="/register" className="xds-btn xds-btn-primary">
                {t.wizardCta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </BoundaryLink>
              <BoundaryLink href="/docs" className="xds-link-arrow">
                {t.wizardDocs}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </BoundaryLink>
            </div>
          </div>
        </section>

        {/* ───────────────── 界面预览 ───────────────── */}
        {shots.length ? (
          <section className="xds-section-sm xds-preview" id="preview">
            <div className="xds-container">
              <XdsSectionHead
                eyebrow={t.previewEyebrow}
                title={t.previewTitle}
                lead={t.previewLead}
              />
              <div className="xds-gallery">
                {shots.map((shot, idx) => (
                  <figure key={shot.image ?? idx}>
                    <ProductShotFrame
                      src={shot.image}
                      alt={shot.title ?? t.previewTitle}
                      placeholder={t.previewPlaceholder}
                    />
                  </figure>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ───────────────── 能力矩阵 ───────────────── */}
        <section
          className="xds-section-sm"
          id="features"
          style={{
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="xds-container">
            <XdsSectionHead eyebrow={t.featEyebrow} title={t.featTitle} />
            <div className="xds-feat">
              <div className="xds-feat-grid">
                {t.feats.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.t} className="xds-feat-cell">
                      <div className="xds-feat-ico">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <h4>{f.t}</h4>
                      <p className="xds-t-body-sm xds-muted">{f.d}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────── 下载矩阵 ───────────────── */}
        <section className="xds-section-sm" id="download">
          <div className="xds-container">
            <div className="xds-row-between" style={{ alignItems: "flex-end" }}>
              <XdsSectionHead
                eyebrow={t.dlEyebrow}
                title={t.dlTitle}
                lead={t.dlLead}
              />
              <BoundaryLink href="/download" className="xds-link-arrow">
                {t.dlHistory}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </BoundaryLink>
            </div>

            <XdsCard style={{ marginTop: 32, overflow: "hidden" }}>
              <table className="xds-table xds-dl-table">
                <thead>
                  <tr>
                    {t.dlHead.map((h, i) => (
                      <th key={h} style={i === 3 ? { textAlign: "right" } : undefined}>
                        {h}
                      </th>
                    ))}
                    <th style={{ width: "1%" }} />
                  </tr>
                </thead>
                <tbody>
                  {t.dlRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <tr key={row.p}>
                        <td>
                          <div className="xds-row" style={{ gap: 8 }}>
                            <Icon className="h-3.5 w-3.5 xds-subtle" aria-hidden="true" />
                            {row.p}
                          </div>
                        </td>
                        <td className="xds-subtle">{row.a}</td>
                        <td className="xds-t-mono xds-subtle">{row.f}</td>
                        <td className="xds-num xds-subtle">{row.s}</td>
                        <td>
                          <BoundaryLink
                            href="/download"
                            className="xds-btn xds-btn-secondary xds-btn-sm"
                          >
                            {t.dlAction}
                          </BoundaryLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <XdsCardFoot>
                <div className="xds-row" style={{ gap: 8 }}>
                  <Info className="h-3.5 w-3.5 xds-subtle" aria-hidden="true" />
                  <span className="xds-t-caption">{t.dlNote}</span>
                </div>
              </XdsCardFoot>
            </XdsCard>
          </div>
        </section>

        {/* ───────────────── 定价锚点 ───────────────── */}
        <section
          className="xds-section-sm"
          id="pricing"
          style={{
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div className="xds-container">
            <XdsSectionHead
              eyebrow={t.priceEyebrow}
              title={t.priceTitle}
              lead={t.priceLead}
            />
            <div className="xds-price-grid">
              {t.plans.map((plan) => {
                const priced = plan.planId
                  ? formatPlanPrice(catalog.get(plan.planId), lang)
                  : null;
                const yearly = plan.yearlyPlanId
                  ? formatPlanPrice(catalog.get(plan.yearlyPlanId), lang)
                  : null;
                // A catalog-backed card with no published price is not for
                // sale yet; borrowing a number from the copy is how this page
                // came to quote three times what Stripe charges.
                const amount =
                  priced?.amount ??
                  plan.amt ??
                  (lang === "zh" ? "即将上线" : "Coming soon");
                const period = priced ? priced.period : plan.per;
                const feats = plan.planId
                  ? PLAN_COPY[plan.planId][lang].features
                  : (plan.feats ?? []);

                return (
                  <article
                    key={plan.name}
                    className={`xds-card xds-price-card${plan.primary ? " xds-is-featured" : ""}`}
                  >
                    <div className="xds-row-between">
                      <h4>{plan.name}</h4>
                      <XdsBadge tone={plan.tone} dot={false}>
                        {plan.tag}
                      </XdsBadge>
                    </div>
                    <p className="xds-t-caption" style={{ marginTop: 6 }}>
                      {plan.sub}
                    </p>
                    <div className="xds-price-amt" style={{ marginTop: 20 }}>
                      {amount}
                      <span className="xds-per">{period}</span>
                    </div>
                    {yearly ? (
                      <p className="xds-t-caption" style={{ marginTop: 6 }}>
                        {lang === "zh"
                          ? `年付 ${yearly.amount}${yearly.period}`
                          : `or ${yearly.amount}${yearly.period}`}
                      </p>
                    ) : null}
                    <ul className="xds-price-feats">
                      {feats.map((f) => (
                        <li key={f}>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <XdsLinkButton
                      href={plan.href}
                      variant={plan.primary ? "primary" : "secondary"}
                      block
                      style={{ marginTop: 24 }}
                    >
                      {plan.cta}
                    </XdsLinkButton>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────── FAQ ───────────────── */}
        <section className="xds-section-sm">
          <div className="xds-container" style={{ maxWidth: 820 }}>
            <div className="xds-sec-head">
              <XdsEyebrow>{t.faqEyebrow}</XdsEyebrow>
              <h2 className="xds-t-h1">{t.faqTitle}</h2>
            </div>
            <div style={{ marginTop: 32 }}>
              {t.faqs.map((item, i) => (
                <details
                  key={item.q}
                  className="xds-faq-item"
                  open={i === 0}
                  style={i === t.faqs.length - 1 ? { borderBottom: 0 } : undefined}
                >
                  <summary className="xds-faq-q" style={{ listStyle: "none", cursor: "pointer" }}>
                    {item.q}
                    <ChevronDown className="h-3.5 w-3.5 xds-subtle" aria-hidden="true" />
                  </summary>
                  {item.a ? <p className="xds-faq-a">{item.a}</p> : null}
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────── 终版 CTA ───────────────── */}
        <section style={{ paddingBottom: 80 }}>
          <div className="xds-container">
            <div className="xds-final-cta">
              <h2 className="xds-t-display-2">{t.finalTitle}</h2>
              <p
                className="xds-t-lead"
                style={{ color: "#9aa4b5", maxWidth: "34rem", margin: "12px auto 0" }}
              >
                {t.finalSub}
              </p>
              <div className="xds-hero-cta" style={{ marginTop: 32 }}>
                <BoundaryLink href="/register" className="xds-btn xds-btn-primary xds-btn-lg">
                  {t.finalCta}
                </BoundaryLink>
                <BoundaryLink
                  href="/docs"
                  className="xds-btn xds-btn-lg"
                  style={{
                    background: "transparent",
                    borderColor: "#3d4553",
                    color: "#fff",
                  }}
                >
                  {t.finalDocs}
                </BoundaryLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <XdsSiteFooter brand="XConnect" />
    </div>
  );
}
