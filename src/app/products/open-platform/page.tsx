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

        <section className={`${marketingTheme.section.container} mt-16`}>
          <div className="flex flex-col gap-24">
            
            {/* Unified Open Control Plane */}
            <div className="flex flex-col items-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 text-center">统一控制面底座 (Unified Open Control Plane)</h2>
              <p className="text-lg text-slate-600 mb-10 text-center max-w-3xl">
                提供统一的开放控制平面，将底层设施与服务整合，实现从代码托管到安全交付的无缝协作。
              </p>
              <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <img 
                  src="/marketing/Open-Platform/unified-open-control-plane.png" 
                  alt="Unified Open Control Plane" 
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Four Trusted Foundations */}
            <div className="flex flex-col items-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 text-center">四大可信基石 (Four Trusted Foundations)</h2>
              <p className="text-lg text-slate-600 mb-10 text-center max-w-3xl">
                构建牢固的安全基础设施，提供强大的身份验证、代码安全、数据保护与合规监控体系。
              </p>
              <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <img 
                  src="/marketing/Open-Platform/four-trusted-foundations.png" 
                  alt="Four Trusted Foundations" 
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Secure Delivery Lifecycle */}
            <div className="flex flex-col items-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 text-center">安全交付生命周期 (Secure Delivery Lifecycle)</h2>
              <p className="text-lg text-slate-600 mb-10 text-center max-w-3xl">
                全面覆盖从开发构建、测试部署到生产运行的每一环节，确保软件交付链路的绝对安全与合规。
              </p>
              <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <img 
                  src="/marketing/Open-Platform/secure-delivery-lifecycle.png" 
                  alt="Secure Delivery Lifecycle" 
                  className="w-full h-auto"
                />
              </div>
            </div>

          </div>
        </section>
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
