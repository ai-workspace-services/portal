"use client";

import { marketingTheme } from "@/components/marketing/theme";
import {
  Activity,
  Bot,
  Cpu,
  Globe,
  Layers,
  Lock,
  Monitor,
  Network,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { WebsiteShowcasePayload } from "@/lib/docsServiceClient";

interface ProductShowcasesProps {
  showcases: WebsiteShowcasePayload[];
}

const ICONS: Record<string, any> = {
  bot: Bot,
  network: Network,
  monitor: Monitor,
  shield: Shield,
  "shield-check": ShieldCheck,
  activity: Activity,
  layers: Layers,
  lock: Lock,
  zap: Zap,
  globe: Globe,
  cpu: Cpu,
};

export default function ProductShowcases({ showcases }: ProductShowcasesProps) {
  if (!showcases || showcases.length === 0) {
    return null;
  }

  return (
    <section className={`${marketingTheme.section.container} mt-24 sm:mt-32 space-y-28 sm:space-y-36`}>
      {showcases.map((showcase, idx) => {
        const Icon = (showcase.icon && ICONS[showcase.icon]) || Shield;
        const isReverse = showcase.reverse;

        return (
          <div
            key={idx}
            className={`flex flex-col ${
              isReverse ? "lg:flex-row-reverse" : "lg:flex-row"
            } items-center gap-12`}
          >
            <div className={`flex-1 ${isReverse ? "lg:pl-10" : "lg:pr-10"}`}>
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                {showcase.title}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                {showcase.description}
              </p>
            </div>
            <div className="flex-1 w-full relative">
              <div
                className={`absolute -inset-4 bg-gradient-to-${
                  isReverse ? "tl" : "tr"
                } from-indigo-100 to-purple-50 opacity-50 blur-xl rounded-full`}
              />
              <div className="relative rounded-3xl border border-slate-200 bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden p-2">
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
  );
}
