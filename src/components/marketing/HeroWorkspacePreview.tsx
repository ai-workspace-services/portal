"use client";

import { Bot, Boxes, Database, Network, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";

type Product = {
  title: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  tone: string;
};

const copy = {
  zh: {
    products: {
      workmate: { title: "XWorkmate", label: "AI 工作空间平台", description: "上下文 · 记忆 · 协作 · 执行", Icon: Boxes, tone: "bg-[#142a82] text-white" },
      connect: { title: "XConnect", label: "AI 连接能力", description: "安全 · 私有 · 全球覆盖", Icon: Network, tone: "bg-[#f3f5ff] text-[#12255f]" },
      workspace: { title: "AI Workspace", label: "个人 · 团队 · 组织", description: "多种形态协同工作", Icon: Bot, tone: "bg-[#f3f5ff] text-[#12255f]" },
      platform: { title: "Open Platform", label: "开放平台", description: "云中立 · 开放 · 可扩展", Icon: ShieldCheck, tone: "bg-[#eef1ff] text-[#12255f]" },
    },
    capabilities: [
      { label: "Models", icon: Boxes },
      { label: "Agents", icon: Bot },
      { label: "Tools", icon: Wrench },
      { label: "Data", icon: Database },
    ],
  },
  en: {
    products: {
      workmate: { title: "XWorkmate", label: "AI Workspace Platform", description: "Context · Memory · Collaboration · Execution", Icon: Boxes, tone: "bg-[#142a82] text-white" },
      connect: { title: "XConnect", label: "AI Connectivity", description: "Secure · Private · Global", Icon: Network, tone: "bg-[#f3f5ff] text-[#12255f]" },
      workspace: { title: "AI Workspace", label: "Personal · Team · Organization", description: "Work in every context", Icon: Bot, tone: "bg-[#f3f5ff] text-[#12255f]" },
      platform: { title: "Open Platform", label: "Open Foundation", description: "Cloud-neutral · Open · Extensible", Icon: ShieldCheck, tone: "bg-[#eef1ff] text-[#12255f]" },
    },
    capabilities: [
      { label: "Models", icon: Boxes },
      { label: "Agents", icon: Bot },
      { label: "Tools", icon: Wrench },
      { label: "Data", icon: Database },
    ],
  },
} as const;

function ProductHex({ product, featured = false }: { product: Product; featured?: boolean }) {
  const { Icon } = product;
  return (
    <article className={`hero-hex relative flex aspect-[1.08/1] flex-col items-center justify-center px-6 text-center ${product.tone} ${featured ? "shadow-[0_22px_40px_rgba(20,42,130,0.26)]" : "border border-indigo-200/80 shadow-[0_14px_32px_rgba(88,92,184,0.09)]"}`}>
      <Icon className={`mb-3 h-8 w-8 ${featured ? "text-white" : "text-indigo-600"}`} aria-hidden />
      <h2 className="text-xl font-semibold tracking-[-0.035em] sm:text-2xl">{product.title}</h2>
      <p className={`mt-1.5 text-xs font-semibold ${featured ? "text-indigo-100" : "text-indigo-600"}`}>{product.label}</p>
      <p className={`mt-2 text-[11px] leading-4 ${featured ? "text-indigo-100/85" : "text-slate-500"}`}>{product.description}</p>
    </article>
  );
}

export default function HeroWorkspacePreview() {
  const { language } = useLanguage();
  const { products, capabilities } = copy[language];

  return (
    <div className="relative mx-auto w-full max-w-[740px] py-6 lg:py-10">
      <div aria-hidden className="absolute inset-x-[13%] top-[17%] h-[68%] rounded-full bg-[radial-gradient(circle,_rgba(122,116,255,0.16),_transparent_67%)] blur-3xl" />
      <div className="relative mx-auto grid max-w-[620px] grid-cols-2 gap-2.5 sm:gap-4">
        <div className="translate-y-4 sm:translate-y-8"><ProductHex product={products.connect} /></div>
        <div className="translate-y-4 sm:translate-y-8"><ProductHex product={products.workspace} /></div>
        <div className="col-span-2 mx-auto -mt-10 w-[55%] min-w-[210px] sm:-mt-14"><ProductHex product={products.workmate} featured /></div>
        <div className="col-span-2 mx-auto -mt-9 w-[78%] min-w-[285px] sm:-mt-12"><ProductHex product={products.platform} /></div>
      </div>

      <div className="relative mx-auto mt-3 grid max-w-[560px] grid-cols-4 gap-2 sm:mt-5 sm:gap-3">
        {capabilities.map(({ label, icon: Icon }) => (
          <div key={label} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-indigo-100 bg-white/80 px-2 text-center shadow-sm backdrop-blur">
            <Icon className="h-4 w-4 text-indigo-500" aria-hidden />
            <span className="mt-1 text-[10px] font-semibold text-slate-600 sm:text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
