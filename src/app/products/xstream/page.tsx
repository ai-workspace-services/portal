"use client";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { marketingTheme } from "@/components/marketing/theme";
import { ArrowRight, Zap, Shield, Globe } from "lucide-react";
import Link from "next/link";

export default function XstreamPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <MarketingNav />
      <main className="pt-24 pb-16 sm:pt-32">
        {/* Hero Section */}
        <section className={`${marketingTheme.section.container} text-center`}>
          <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-50/50 px-3 py-1 text-sm font-medium text-indigo-600 mb-8">
            <Zap className="mr-2 h-4 w-4" />
            AI加速代理私有网络互联
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Xstream Platform
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-10">
            涵盖 Caddy、Xray 隧道与观测代理及控制面同步节点，为您打造极速、安全、无缝互联的私有网络底层基础设施。
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/panel" className={marketingTheme.cta.primary}>
              进入控制台 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/prices" className={marketingTheme.cta.secondary}>
              查看定价
            </Link>
          </div>
        </section>

        {/* Product Showcase */}
        <section className={`${marketingTheme.section.container} mt-16`}>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden mb-24">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
            </div>
            <img 
              src="/marketing/xstream/homepage.png" 
              alt="Xstream Homepage Design" 
              className="w-full object-cover"
            />
          </div>

          {/* Features Grid Layout mimicing design */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">全方位控制面板</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                通过我们现代化的控制台，您可以实时监控您的私有网络节点状态、管理 Xray 隧道配置，并实现全局观测。
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-slate-600"><Globe className="mr-3 h-5 w-5 text-indigo-500" /> 全球节点统一管理</li>
                <li className="flex items-center text-slate-600"><Zap className="mr-3 h-5 w-5 text-indigo-500" /> 毫秒级配置同步</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden transform md:rotate-2 hover:rotate-0 transition-transform duration-300">
              <img 
                src="/marketing/xstream/panel.png" 
                alt="Xstream Panel Design" 
                className="w-full object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-24 md:flex-row-reverse">
            <div className="order-2 md:order-1 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden transform md:-rotate-2 hover:rotate-0 transition-transform duration-300">
              <img 
                src="/marketing/xstream/product.png" 
                alt="Xstream Product Design" 
                className="w-full object-cover"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">深度集成的产品生态</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Xstream Platform 并非孤立的网络组件，它与我们的 AI 模型路由、代理系统深度融合。提供无缝的私有网络互联体验。
              </p>
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">简单透明的定价</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">按需计费，没有隐藏费用。</p>
          </div>
          <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 shadow-xl overflow-hidden bg-white">
            <img 
              src="/marketing/xstream/pricing.png" 
              alt="Xstream Pricing Design" 
              className="w-full object-cover"
            />
          </div>
        </section>
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
