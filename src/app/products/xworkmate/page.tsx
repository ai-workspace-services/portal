"use client";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { marketingTheme } from "@/components/marketing/theme";
import { ArrowRight, Bot, Cpu, Network, ShieldCheck, Lock, Layers, Activity, Monitor } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageProvider";
import xworkmateContent from "@/data/content/xworkmate.json";

const ICONS: Record<string, any> = {
  bot: Bot,
  network: Network,
  monitor: Monitor,
  shield: ShieldCheck,
  activity: Activity,
  layers: Layers,
  lock: Lock,
};

export default function XworkmatePage() {
  const { language } = useLanguage();
  const content = xworkmateContent[language];
  const { hero, showcases } = content;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <MarketingNav />
      <main className="pt-24 pb-16 sm:pt-32">
        {/* Hero Section */}
        <section className={`${marketingTheme.section.container} text-center`}>
          <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-50/50 px-3 py-1 text-sm font-medium text-blue-600 mb-8">
            <Cpu className="mr-2 h-4 w-4" />
            {hero.badge}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
            {hero.title}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 mb-10">
            {hero.subtitle}
          </p>
          <div className="flex justify-center gap-4">
            <Link href={hero.cta.href} className={marketingTheme.cta.primary}>
              {hero.cta.label} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Feature Highlights via Generated Images */}
        <section className={`${marketingTheme.section.container} mt-16 space-y-32`}>
          {showcases.map((showcase: any, idx: number) => {
            const Icon = ICONS[showcase.icon] || Cpu;
            const isReverse = showcase.reverse;

            return (
              <div key={idx} className={`flex flex-col ${isReverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}>
                <div className={`flex-1 ${isReverse ? 'lg:pl-10' : 'lg:pr-10'}`}>
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-inner">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">{showcase.title}</h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    {showcase.description}
                  </p>
                </div>
                <div className="flex-1 w-full relative">
                  <div className={`absolute -inset-4 bg-gradient-to-${isReverse ? 'tl' : 'tr'} from-blue-100 to-indigo-50 opacity-50 blur-xl rounded-full`} />
                  <div className="relative rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden p-2">
                    <div className="rounded-2xl overflow-hidden">
                      <img 
                        src={encodeURI(showcase.image)} 
                        alt={showcase.title} 
                        className="w-full object-cover transform hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
