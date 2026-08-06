"use client";

import React from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import Footer from "../../components/Footer";
import { MessageCircle, Mail, Book, LifeBuoy, Github, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "../../i18n/LanguageProvider";

export default function SupportPage() {
    const { language } = useLanguage();
    const isChinese = language === "zh";

    const content = {
        title: isChinese ? "我们如何为您提供帮助？" : "How can we help you?",
        subtitle: isChinese
            ? "浏览文档、加入社区或直接联系我们的支持团队"
            : "Browse documentation, join the community, or contact our support team directly.",
        cards: [
            {
                icon: Book,
                title: isChinese ? "文档中心" : "Documentation",
                description: isChinese
                    ? "查找详细的指南、API 参考和最佳实践。"
                    : "Find detailed guides, API references, and best practices.",
                link: "/docs",
                linkText: isChinese ? "浏览文档" : "Browse Docs"
            },
            {
                icon: MessageCircle,
                title: isChinese ? "社区论坛" : "Community Forum",
                description: isChinese
                    ? "与其他开发者交流，分享经验和解决问题。"
                    : "Connect with other developers, share experiences, and solve problems.",
                link: "https://github.com/orgs/x-evor/discussions",
                linkText: isChinese ? "加入讨论" : "Join Discussions"
            },
            {
                icon: Mail,
                title: isChinese ? "联系支持" : "Contact Support",
                description: isChinese
                    ? "遇到技术问题？我们的团队随时为您提供帮助。"
                    : "Facing technical issues? Our team is ready to help.",
                link: "mailto:haitaopanhq@gmail.com",
                linkText: isChinese ? "发送邮件" : "Email Us"
            }
        ]
    };

    return (
        <div className="min-h-screen bg-background text-text transition-colors duration-150 flex flex-col">
            <MarketingNav />

            <main className="flex-1 relative overflow-hidden pt-24 pb-20">
                <div
                    className="absolute inset-0 bg-gradient-app-from opacity-20 pointer-events-none"
                    aria-hidden
                />

                <div className="relative mx-auto max-w-7xl px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-6xl">
                            {content.title}
                        </h1>
                        <p className="text-lg text-text-muted">
                            {content.subtitle}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {content.cards.map((card, index) => (
                            <div
                                key={index}
                                className="group relative rounded-2xl p-8 border border-surface-border bg-surface hover:border-primary/50 hover:bg-surface-hover transition-all duration-300"
                            >
                                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <card.icon size={24} />
                                </div>

                                <h3 className="text-xl font-semibold text-heading mb-3 group-hover:text-primary transition-colors">
                                    {card.title}
                                </h3>

                                <p className="text-text-muted mb-8 leading-relaxed">
                                    {card.description}
                                </p>

                                <Link
                                    href={card.link}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
                                >
                                    {card.linkText}
                                    <ExternalLink size={14} />
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 rounded-3xl bg-surface-muted/50 border border-surface-border p-8 md:p-12 text-center max-w-4xl mx-auto">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-background border border-surface-border mb-6">
                            <LifeBuoy size={32} className="text-text-muted" />
                        </div>
                        <h2 className="text-2xl font-bold text-heading mb-4">
                            {isChinese ? "还需要帮助？" : "Still need help?"}
                        </h2>
                        <p className="text-text-muted mb-8 max-w-xl mx-auto">
                            {isChinese
                                ? "如果您无法在文档或社区中找到答案，请随时与我们联系。"
                                : "If you can't find the answer in our documentation or community, feel free to reach out."}
                        </p>
                        <a
                            href="mailto:haitaopanhq@gmail.com"
                            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                        >
                            haitaopanhq@gmail.com
                        </a>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
