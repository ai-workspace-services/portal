"use client";

import {
  PublicPageIntro,
  PublicPageShell,
} from "@/components/public/PublicPageShell";
import { useLanguage } from "@/i18n/LanguageProvider";

const enContent = {
  title: "About XWork Technologies",
  paragraphs: [
    "XWork Technologies LLC is a software company focused on building AI-powered productivity tools and cloud-neutral infrastructure solutions.",
    "We create modern software products that combine artificial intelligence, automation, and open technologies to help individuals, developers, and organizations improve productivity and build flexible digital experiences.",
    "Through products such as SVC+ XWork Tech Platform, XWorkmate AI Workspace, and XConnect AI Connectivity, we explore practical solutions that make technology more accessible, intelligent, and adaptable.",
    "Our focus areas include:",
    "• AI-powered productivity tools: Building intelligent software experiences that help users work more efficiently.",
    "• Cloud-neutral infrastructure solutions: Creating flexible and scalable technology solutions across different environments.",
    "• Developer-focused platforms: Providing tools and platforms that simplify modern software development and workflows.",
    "XWork Technologies LLC is committed to creating reliable, user-focused software products for the evolving digital world."
  ]
};

const zhContent = {
  title: "关于 XWork Technologies",
  paragraphs: [
    "XWork Technologies LLC 是一家专注于构建由人工智能驱动的生产力工具和云中立基础设施解决方案的软件公司。",
    "我们致力于打造现代化的软件产品，结合人工智能、自动化与开放技术，帮助个人、开发者和企业提升生产力并构建灵活的数字体验。",
    "通过 SVC+ XWork Tech Platform、XWorkmate AI Workspace 和 XConnect AI Connectivity 等产品，我们不断探索实用的解决方案，让技术更加易于使用、智能且具备极强的适应性。",
    "我们的核心领域包括：",
    "• AI 生产力工具：构建智能的软件体验，帮助用户更高效地工作。",
    "• 云中立基础设施解决方案：在不同环境中提供灵活且可扩展的技术底座。",
    "• 开发者平台：提供各类工具和平台，简化现代软件开发与工作流。",
    "XWork Technologies LLC 致力于为不断演进的数字世界创造可靠、以用户为中心的软件产品。"
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
