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
    { label: "Industry", value: "B2B Software Development" },
  ],
  activitiesTitle: "Core Focus",
  activities: [
    "AI Workspace",
    "Cloud-Neutral Platform",
    "Developer Infrastructure",
    "AI Connectivity",
    "Open Platform",
  ],
  productsTitle: "Platform",
  products: [
    { name: "SVC+ Cloud-Neutral Platform", description: "A professional platform offering AI-native workspace solutions, developer infrastructure, and seamless open platform connectivity." },
  ]
};

const zhContent = {
  title: "公司信息",
  details: [
    { label: "公司名称", value: "XWork Technologies LLC" },
    { label: "品牌名称", value: "XWork Technologies" },
    { label: "实体类型", value: "有限责任公司 (LLC)" },
    { label: "所属行业", value: "B2B 软件开发" },
  ],
  activitiesTitle: "核心方向",
  activities: [
    "AI 原生工作区 (AI Workspace)",
    "云中立平台 (Cloud-Neutral Platform)",
    "开发者基础设施 (Developer Infrastructure)",
    "AI 连接 (AI Connectivity)",
    "开放平台 (Open Platform)",
  ],
  productsTitle: "旗下平台",
  products: [
    { name: "SVC+ Cloud-Neutral Platform", description: "一个专业的 B2B 平台，提供 AI 原生工作区解决方案、开发者基础设施以及无缝的开放平台连接。" },
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
          titleClassName="editorial-display text-[2.9rem] tracking-[-0.06em] sm:text-[3.6rem]"
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
