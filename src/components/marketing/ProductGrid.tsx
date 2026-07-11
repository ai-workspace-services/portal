"use client";

import Link from "next/link";
import { ArrowRight, Cloud, Eye, RefreshCw, ShieldCheck, type LucideIcon } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageProvider";
import { homeMarketingContent } from "@/components/marketing/content";
import { marketingTheme } from "@/components/marketing/theme";
import Carousel from "@/components/marketing/Carousel";

const ICONS: Record<string, LucideIcon> = {
  refresh: RefreshCw,
  cloud: Cloud,
  eye: Eye,
  shield: ShieldCheck,
};

export default function ProductGrid() {
  const { language } = useLanguage();
  const { productGrid } = homeMarketingContent[language];

  return (
    <section className={`${marketingTheme.section.container} ${marketingTheme.section.spacingY}`}>
      <div className="text-center">
        <h2 className={marketingTheme.heading.section}>{productGrid.title}</h2>
        <p className={`${marketingTheme.heading.sectionSubtitle} mx-auto max-w-xl`}>
          {productGrid.subtitle}
        </p>
      </div>

      <div className="mt-10 flex w-full gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {productGrid.items.map((item, index) => {
          const Icon = ICONS[item.icon] ?? Cloud;
          // Different placeholder colors for visual distinction
          const bgColors = [
            "bg-blue-50/50 border-blue-100 text-blue-600",
            "bg-indigo-50/50 border-indigo-100 text-indigo-600",
            "bg-sky-50/50 border-sky-100 text-sky-600",
            "bg-cyan-50/50 border-cyan-100 text-cyan-600",
          ];
          const colorClass = bgColors[index % bgColors.length];

          return (
            <div
              key={item.name}
              className={`relative flex-none w-[85vw] max-w-md snap-center sm:w-[400px] ${marketingTheme.card.base} ${marketingTheme.card.hover} overflow-hidden`}
            >
              {/* Image Placeholder Area for the "Topology Diagram or Card Image" */}
              <div className={`h-48 w-full border-b flex items-center justify-center ${colorClass}`}>
                 {item.name === "Xworkmate/Ai-workspace" ? (
                   <Carousel
                     images={[
                       "/marketing/xworkmate/已生成图像 1.png",
                       "/marketing/xworkmate/已生成图像 2.png",
                       "/marketing/xworkmate/已生成图像 3.png"
                     ]}
                   />
                 ) : item.name === "Xstream Platform" ? (
                   <Carousel
                     images={[
                       "/marketing/xstream/homepage.png",
                       "/marketing/xstream/panel.png",
                       "/marketing/xstream/pricing.png",
                       "/marketing/xstream/product.png"
                     ]}
                   />
                 ) : item.name.toLowerCase().includes("open") ? (
                   <Carousel
                     images={[
                       "/marketing/Open-Platform/unified-open-control-plane.png",
                       "/marketing/Open-Platform/four-trusted-foundations.png",
                       "/marketing/Open-Platform/secure-delivery-lifecycle.png"
                     ]}
                   />
                 ) : (
                   <div className="text-center">
                     <Icon className="h-10 w-10 mx-auto mb-2 opacity-50" aria-hidden />
                     <span className="text-sm font-medium opacity-70">
                       [此处放置 {item.name} 的连线拓扑图/卡片图片]
                     </span>
                   </div>
                 )}
              </div>

              <div className="p-6">
                <div className={marketingTheme.iconBadge.base}>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {item.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-3">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {item.learnMore}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
