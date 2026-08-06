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
    { label: "Entity Type", value: "Limited Liability Company (LLC)" },
    { label: "Registered State", value: "Wyoming, United States" },
    { label: "Industry", value: "Software Development" },
  ],
  activitiesTitle: "Business Activities",
  activities: [
    "AI Software Applications",
    "Cloud-native Platform Development",
    "Developer Tools",
    "SaaS Products",
    "Software Infrastructure Solutions",
  ],
  productsTitle: "Products",
  products: [
    { name: "XWorkmate", description: "AI Workspace platform for productivity and intelligent workflows." },
    { name: "XConnect", description: "AI connectivity platform connecting applications, services, and AI capabilities." },
    { name: "Cloud-Neutral Platform", description: "Developer infrastructure and tools designed for flexible cloud environments." },
  ]
};

const zhContent = {
  title: "公司信息",
  details: [
    { label: "公司名称", value: "XWork Technologies LLC" },
    { label: "实体类型", value: "有限责任公司 (LLC)" },
    { label: "注册地", value: "美国怀俄明州" },
    { label: "所属行业", value: "软件开发" },
  ],
  activitiesTitle: "业务范围",
  activities: [
    "人工智能软件应用",
    "云原生平台开发",
    "开发者工具",
    "SaaS 产品",
    "软件基础设施解决方案",
  ],
  productsTitle: "旗下产品",
  products: [
    { name: "XWorkmate", description: "面向生产力和智能工作流的 AI 工作区平台。" },
    { name: "XConnect", description: "连接应用程序、服务和 AI 能力的 AI 连接平台。" },
    { name: "Cloud-Neutral Platform", description: "专为灵活的云环境设计的开发者基础设施和工具。" },
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
