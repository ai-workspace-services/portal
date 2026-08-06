"use client";

import React from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import Footer from "../../../components/Footer";
import Discussions from "../../../components/support/Discussions";
import { useLanguage } from "../../../i18n/LanguageProvider";

export default function DiscussionsPage() {
    const { language } = useLanguage();
    const isChinese = language === "zh";

    return (
        <div className="min-h-screen bg-background text-text transition-colors duration-150 flex flex-col">
            <MarketingNav />

            <main className="flex-1 relative overflow-hidden pt-24 pb-20">
                <div className="relative mx-auto max-w-5xl px-6">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl mb-4">
                            {isChinese ? "社区讨论" : "Community Discussions"}
                        </h1>
                        <p className="text-text-muted max-w-2xl mx-auto">
                            {isChinese
                                ? "欢迎来到 Cloud-Neutral Toolkit 社区！这里是分享想法、提出问题和与其他开发者交流的地方。"
                                : "Welcome to the Cloud-Neutral Toolkit community! This is the place to share ideas, ask questions, and connect with other developers."}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-surface-border bg-surface p-6 sm:p-8">
                        <Discussions />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
