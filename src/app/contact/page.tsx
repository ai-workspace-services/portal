"use client";

import React from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import Footer from "../../components/Footer";
import { Mail, Globe } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageProvider";

const enContent = {
  title: "Contact Us",
  company: "XWork Technologies LLC",
  cards: [
    {
      icon: Mail,
      title: "Email",
      value: "haitaopan@xworktech.com",
      link: "mailto:haitaopan@xworktech.com",
    },
    {
      icon: Globe,
      title: "Website",
      value: "https://xworktech.com",
      link: "https://xworktech.com",
    },
    {
      icon: Mail,
      title: "Support",
      value: "support@xworktech.com",
      link: "mailto:support@xworktech.com",
    }
  ],
  inquiriesTitle: "Business Inquiries",
  inquiriesDesc: "Please contact us via email for partnership, product, and business inquiries."
};

const zhContent = {
  title: "联系我们",
  company: "XWork Technologies LLC",
  cards: [
    {
      icon: Mail,
      title: "电子邮件",
      value: "haitaopan@xworktech.com",
      link: "mailto:haitaopan@xworktech.com",
    },
    {
      icon: Globe,
      title: "官方网站",
      value: "https://xworktech.com",
      link: "https://xworktech.com",
    },
    {
      icon: Mail,
      title: "技术支持",
      value: "support@xworktech.com",
      link: "mailto:support@xworktech.com",
    }
  ],
  inquiriesTitle: "商业合作",
  inquiriesDesc: "有关合作、产品及业务咨询，请通过电子邮件与我们联系。"
};

export default function ContactPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const content = isChinese ? zhContent : enContent;

  return (
    <div className="min-h-screen bg-background text-text transition-colors duration-150 flex flex-col">
      <MarketingNav />
      <main className="flex-1 relative overflow-hidden pt-24 pb-20">
        <div className="absolute inset-0 bg-gradient-app-from opacity-20 pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-6xl">
              {content.title}
            </h1>
            <p className="text-lg text-text-muted font-medium">
              {content.company}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {content.cards.map((card, index) => (
              <a
                key={index}
                href={card.link}
                className="group relative rounded-2xl p-8 border border-surface-border bg-surface hover:border-primary/50 hover:bg-surface-hover transition-all duration-300 flex flex-col items-center text-center"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <card.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-heading mb-3 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-text-muted font-medium break-all">
                  {card.value}
                </p>
              </a>
            ))}
          </div>
          <div className="mt-20 rounded-3xl bg-surface-muted/50 border border-surface-border p-8 md:p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-heading mb-4">
              {content.inquiriesTitle}
            </h2>
            <p className="text-text-muted text-lg max-w-xl mx-auto">
              {content.inquiriesDesc}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
