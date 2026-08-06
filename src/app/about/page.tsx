"use client";

import {
  PublicPageIntro,
  PublicPageShell,
} from "@/components/public/PublicPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";

const enContent = {
  title: "About XWork Technologies",
  paragraphs: [
    "XWork Technologies LLC is a B2B software company building AI-native workspaces, cloud-neutral infrastructure, and developer platforms.",
    "As the creator of the SVC+ Cloud-Neutral Platform, we deliver robust solutions designed to optimize AI connectivity, empower open platform integrations, and provide scalable developer infrastructure.",
    "Our focus is creating reliable and professional software products that help organizations build, manage, and scale their digital capabilities across diverse environments.",
    "We believe enterprise software should be accessible, intelligent, and adaptable to the evolving needs of modern businesses."
  ]
};

const zhContent = {
  title: "关于 XWork Technologies",
  paragraphs: [
    "XWork Technologies LLC 是一家 B2B 软件公司，致力于构建 AI 原生工作区、云中立基础设施和开发者平台。",
    "作为 SVC+ Cloud-Neutral Platform 的核心开发方，我们提供可靠的解决方案，旨在优化 AI 连接、赋能开放平台集成并提供可扩展的开发者基础设施。",
    "我们的重点是创造专业、可靠的软件产品，帮助企业在多样化的环境中构建、管理和扩展其数字能力。",
    "我们相信企业级软件应该是易于访问、智能的，并能够适应现代企业不断变化的需求。"
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
