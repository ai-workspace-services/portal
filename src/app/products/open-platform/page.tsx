"use client";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { marketingTheme } from "@/components/marketing/theme";
import { ArrowRight, Zap, Shield, Globe } from "lucide-react";
import Link from "next/link";

export default function OpenPlatformPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <MarketingNav />
      <main className="pt-24 pb-16 sm:pt-32">
        {/* Hero Section */}
        <section className={`${marketingTheme.section.container} text-center`}>
          <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-50/50 px-3 py-1 text-sm font-medium text-indigo-600 mb-8">
            <Globe className="mr-2 h-4 w-4" />
            开源解决方案
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Open-Platform
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-10">
            涵盖 Gitea、Vault、IAM (Zitadel) 以及全局可观测性底座，为您提供安全、开放、可扩展的基础设施与平台解决方案。
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/panel" className={marketingTheme.cta.primary}>
              进入控制台 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/prices" className={marketingTheme.cta.secondary}>
              查看服务方案
            </Link>
          </div>
        </section>

        {/* Product Showcase Placeholder */}
        <section className={`${marketingTheme.section.container} mt-16 text-center`}>
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-32">
             <Globe className="mx-auto h-16 w-16 text-slate-300 mb-4" />
             <h3 className="text-xl font-medium text-slate-500">Open-Platform 页面内容建设中</h3>
             <p className="text-slate-400 mt-2">开源生态图谱、架构展示与文档资源即将上线</p>
          </div>
        </section>
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
