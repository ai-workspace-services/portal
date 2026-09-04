"use client";

import {
  PublicPageIntro,
  PublicPageShell,
} from "@/components/public/PublicPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";

const enContent = {
  title: "Company Information",
  details: [
    { label: "Company Name", value: "XWork Technologies LLC" },
    { label: "Brand", value: "XWork Technologies" },
    { label: "Entity Type", value: "Limited Liability Company (LLC)" },
    { label: "Industry", value: "Software Development" },
  ],
  activitiesTitle: "Core Focus",
  activities: [
    "AI-Powered Productivity Tools",
    "XWork Tech Infrastructure",
    "Developer Platforms",
    "AI Connectivity & Integration"
  ],
  productsTitle: "Platform",
  products: [
    { name: "SVC+ XWork Tech Platform", description: "A robust platform offering developer infrastructure, AI integrations, and flexible cloud environments for businesses and individuals." },
  ]
};

const zhContent = {
  title: "公司信息",
  details: [
    { label: "公司名称", value: "XWork Technologies LLC" },
    { label: "品牌名称", value: "XWork Technologies" },
    { label: "实体类型", value: "有限责任公司 (LLC)" },
    { label: "所属行业", value: "软件开发" },
  ],
  activitiesTitle: "核心方向",
  activities: [
    "人工智能生产力工具 (AI Productivity Tools)",
    "云中立基础设施 (XWork Tech Infrastructure)",
    "开发者平台 (Developer Platforms)",
    "AI 连接与集成 (AI Connectivity)"
  ],
  productsTitle: "旗下平台",
  products: [
    { name: "SVC+ XWork Tech Platform", description: "一个可靠的平台，为企业和个人提供开发者基础设施、AI 集成和灵活的云环境。" },
  ]
};

export default function CompanyPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const content = isChinese ? zhContent : enContent;

  return (
    <PublicPageShell>
      <section className="rounded-[2.4rem] border border-slate-900/10 bg-[linear-gradient(180deg,#ffffff,#faf7f2)] p-6 shadow-[0_22px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10 mb-8">
        <PublicPageIntro
          title={content.title}
          titleClassName="editorial-display text-5xl tracking-[-0.06em] sm:text-6xl"
        />
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            {content.details.map((detail, i) => (
              <div key={i} className="flex flex-col border-b border-slate-900/10 pb-3">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{detail.label}</span>
                <span className="text-lg text-slate-900 font-medium mt-1">{detail.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{content.activitiesTitle}</h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-700">
                {content.activities.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{content.productsTitle}</h3>
              <div className="space-y-4">
                {content.products.map((prod, i) => (
                  <div key={i} className="rounded-xl border border-slate-900/10 bg-white/60 p-4">
                    <h4 className="font-semibold text-slate-900 text-lg">{prod.name}</h4>
                    <p className="text-slate-600 mt-1">{prod.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
