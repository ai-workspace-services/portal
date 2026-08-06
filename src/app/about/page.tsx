"use client";

import {
  PublicPageIntro,
  PublicPageShell,
} from "@/components/public/PublicPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";

const enContent = {
  title: "About XWork Technologies LLC",
  paragraphs: [
    "XWork Technologies LLC is a software development company based in Wyoming, USA.",
    "We build AI-powered applications, cloud-native platforms, and developer-focused tools that help individuals and organizations improve productivity through modern software technologies.",
    "Our focus is creating reliable, scalable, and user-friendly software products for the global digital economy.",
    "We believe software should be accessible, intelligent, and adaptable to the evolving needs of users and businesses."
  ]
};

const zhContent = {
  title: "关于 XWork Technologies LLC",
  paragraphs: [
    "XWork Technologies LLC 是一家总部位于美国怀俄明州的软件开发公司。",
    "我们致力于构建由人工智能驱动的应用程序、云原生平台和以开发者为中心的工具，通过现代软件技术帮助个人和组织提高生产力。",
    "我们的重点是为全球数字经济创造可靠、可扩展且易于使用的软件产品。",
    "我们认为软件应该是可访问的、智能的，并能够适应用户和企业不断变化的需求。"
  ]
};

export default function AboutPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const content = isChinese ? zhContent : enContent;

  return (
    <PublicPageShell>
      <section className="rounded-[2.4rem] border border-slate-900/10 bg-[linear-gradient(180deg,#ffffff,#faf7f2)] p-6 shadow-[0_22px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
        <div className="grid gap-6">
          <PublicPageIntro
            title={content.title}
            titleClassName="editorial-display text-[2.9rem] tracking-[-0.06em] sm:text-[3.6rem]"
          />
          <div className="space-y-4 text-slate-700 text-[1.1rem] leading-8 max-w-4xl pt-4">
            {content.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
