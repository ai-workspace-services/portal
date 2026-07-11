"use client";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { marketingTheme } from "@/components/marketing/theme";
import { ArrowRight, Bot, Cpu, Network } from "lucide-react";
import Link from "next/link";

export default function XworkmatePage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <MarketingNav />
      <main className="pt-24 pb-16 sm:pt-32">
        {/* Hero Section */}
        <section className={`${marketingTheme.section.container} text-center`}>
          <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-50/50 px-3 py-1 text-sm font-medium text-blue-600 mb-8">
            <Cpu className="mr-2 h-4 w-4" />
            AI 核心链路域
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Xworkmate
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-10">
            涵盖 App LiteLLM、OpenClaw、QMD 等智能代理与模型路由调度，赋予应用真正的 AI 原生能力。
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/panel" className={marketingTheme.cta.primary}>
              立即体验 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Feature Highlights via Generated Images */}
        <section className={`${marketingTheme.section.container} mt-16 space-y-32`}>
          {/* Showcase 1 */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 lg:pr-10">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-inner">
                <Bot className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">智能代理矩阵</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                利用高级多智能体架构进行任务协作。不管是大模型的接入，还是基于上下文的精准响应，Xworkmate 为您全盘搞定。
              </p>
            </div>
            <div className="flex-1 w-full relative">
              {/* Glassmorphism decoration */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-indigo-50 opacity-50 blur-xl rounded-full" />
              <div className="relative rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden p-2">
                <div className="rounded-2xl overflow-hidden">
                  <img 
                    src="/marketing/xworkmate/已生成图像 1.png" 
                    alt="Xworkmate AI Interface" 
                    className="w-full object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Showcase 2 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="flex-1 lg:pl-10">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner">
                <Network className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">动态模型路由</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                LiteLLM 原生集成，轻松切换不同的模型供应商，实现智能负载均衡和成本最优的模型路由策略。
              </p>
            </div>
            <div className="flex-1 w-full relative">
              <div className="absolute -inset-4 bg-gradient-to-tl from-indigo-100 to-purple-50 opacity-50 blur-xl rounded-full" />
              <div className="relative rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden p-2">
                <div className="rounded-2xl overflow-hidden">
                  <img 
                    src="/marketing/xworkmate/已生成图像 2.png" 
                    alt="Xworkmate Model Routing" 
                    className="w-full object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Showcase 3 */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 lg:pr-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">全息可观测视界</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                直观的数据与节点拓扑展示，所有的请求、资源开销以及智能体的状态尽在掌握中，真正做到所见即所得。
              </p>
            </div>
            <div className="flex-1 w-full relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-sky-100 to-blue-50 opacity-50 blur-xl rounded-full" />
              <div className="relative rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden p-2">
                <div className="rounded-2xl overflow-hidden">
                  <img 
                    src="/marketing/xworkmate/已生成图像 3.png" 
                    alt="Xworkmate Topology and Monitoring" 
                    className="w-full object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                </div>
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
