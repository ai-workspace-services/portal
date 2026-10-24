"use client";

import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Cpu,
  Download,
  Layers,
  Network,
  Terminal,
  Workflow,
  Sparkles,
} from "lucide-react";
import BoundaryLink from "@/components/common/BoundaryLink";
import LanguageToggle from "@/components/LanguageToggle";
import { Github } from "@/components/icons/brand";
import { useLanguage } from "@/i18n/LanguageProvider";
import defaultContent from "@/data/content/xworkmate.json";
import type { XWorkmateContent } from "@/lib/xworkmateContent";
import styles from "./XConnectProductView.module.css";

const serviceImages = [
  "gemini-color.svg",
  "claude-color.svg",
  "openai.svg",
  "grok.svg",
];

const stepIcons = [Download, Cpu, Bot];
const architectureIcons = [Layers, Cpu, Network, Workflow];

export default function XWorkmateProductView({
  content = defaultContent as unknown as XWorkmateContent,
}: {
  content?: XWorkmateContent;
}) {
  const { language } = useLanguage();
  const c = content[language] || content.zh;

  return (
    <div className={`xds ${styles.page}`}>
      {/* 顶部导航 */}
      <header className={styles.header}>
        <BoundaryLink href="/products/xworkmate" className={styles.brand}>
          <Image
            src="/marketing/xworkmate/brand-mark.png"
            alt=""
            width={40}
            height={40}
          />
          {c.hero.title}
        </BoundaryLink>
        <nav aria-label={c.navigation.label} className={styles.nav}>
          {c.navigation.links.map((link) => (
            <BoundaryLink key={link.href} href={link.href}>
              {link.label}
            </BoundaryLink>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <LanguageToggle size="md" />
          <BoundaryLink href={c.navigation.cta.href} className={styles.primary}>
            {c.navigation.cta.label}
          </BoundaryLink>
        </div>
      </header>

      {/* 主体内容 */}
      <main className={styles.main}>
        {/* 1. Hero 区域 */}
        <section className={styles.hero} aria-labelledby="xworkmate-title">
          <p className={styles.eyebrow}>{c.hero.badge}</p>
          <h1 id="xworkmate-title">
            {c.hero.headline[0]} <span>{c.hero.headline[1]}</span>
          </h1>
          <p className={styles.subtitle}>{c.hero.subtitle}</p>
          <div className={styles.actions}>
            <BoundaryLink className={styles.primary} href={c.hero.cta.href}>
              {c.hero.cta.label}
              <ArrowRight size={18} aria-hidden />
            </BoundaryLink>
            <BoundaryLink
              className={styles.secondary}
              href={c.hero.secondaryCta.href}
            >
              <Download size={18} aria-hidden />
              {c.hero.secondaryCta.label}
            </BoundaryLink>
          </div>
          <p className={styles.platforms}>{c.hero.supportedPlatforms}</p>
          
          {/* 大图展示：客户端专职智能体角色调度 */}
          <figure className={styles.showcase} style={{ maxWidth: 960, margin: "0 auto", paddingTop: 20 }}>
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(18, 33, 59, 0.1)",
                boxShadow: "0 24px 48px -12px rgba(18, 33, 59, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)",
                background: "#ffffff",
              }}
            >
              <Image
                src={c.hero.image}
                alt={c.hero.imageAlt}
                width={1024}
                height={606}
                priority
                style={{ width: "100%", height: "auto", display: "block" }}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <figcaption>{c.hero.imageCaption}</figcaption>
          </figure>

          {/* 兼容的模型与生态 Logos */}
          <div className={styles.services}>
            {c.services.names.map((name, index) => (
              <span key={name}>
                {index < 4 ? (
                  <Image
                    src={`/marketing/ai-logos/${serviceImages[index]}`}
                    alt=""
                    width={30}
                    height={30}
                  />
                ) : (
                  <Github size={30} aria-hidden />
                )}
                {name}
              </span>
            ))}
          </div>
          <p className={styles.serviceNote}>{c.services.title}</p>
        </section>

        {/* 2. 3步上手向导 (Wizard) */}
        <section className={styles.steps} aria-labelledby="steps-title">
          <div className={styles.stepsHeading}>
            <h2 id="steps-title">{c.wizard.title}</h2>
            <p>{c.wizard.description}</p>
          </div>
          <ol>
            {c.wizard.steps.map((step, index) => {
              const Icon = stepIcons[index] || Terminal;
              return (
                <li key={step.step}>
                  <BoundaryLink href={step.link} className={styles.stepLink}>
                    <span className={styles.stepNumber}>
                      {String(step.step).padStart(2, "0")}
                    </span>
                    <div>
                      <Icon size={30} aria-hidden />
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </BoundaryLink>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 3. 专职智能体分工与协同 (Bot Roles & Synergy) */}
        <section
          className={styles.diagnostics}
          aria-labelledby="architecture-title"
          id="agent-roles"
        >
          <div className={styles.diagnosticCopy}>
            <p className={styles.eyebrow}>{c.diagnostics.eyebrow}</p>
            <h2 id="architecture-title">
              {c.diagnostics.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p>{c.diagnostics.description}</p>
            <ul className={styles.features}>
              {c.diagnostics.features.map((feature, index) => {
                const Icon = architectureIcons[index] || Check;
                return (
                  <li key={feature}>
                    <span>
                      <Icon size={21} aria-hidden />
                    </span>
                    {feature}
                  </li>
                );
              })}
            </ul>
            <p className={styles.note}>{c.diagnostics.privacyNote}</p>
          </div>
          <figure className={styles.diagnosticImage}>
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(18, 33, 59, 0.1)", background: "#ffffff", boxShadow: "0 16px 32px -8px rgba(18, 33, 59, 0.1)" }}>
              <Image
                src={c.diagnostics.image}
                alt={c.diagnostics.imageAlt}
                width={1024}
                height={631}
                style={{ width: "100%", height: "auto", display: "block" }}
                sizes="(max-width: 768px) 95vw, 600px"
              />
            </div>
            <figcaption>{c.diagnostics.imageCaption}</figcaption>
          </figure>
        </section>

        {/* 4. 多角色智能体团队 (Bot Team) */}
        <section className={styles.guide} aria-labelledby="guide-title">
          <div>
            <p className={styles.eyebrow}>{c.guide.eyebrow}</p>
            <h2 id="guide-title">{c.guide.title}</h2>
            <p>{c.guide.description}</p>
            <BoundaryLink
              href={c.guide.cta.href}
              className={styles.secondary}
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.guide.cta.label}
              <ArrowRight size={18} aria-hidden />
            </BoundaryLink>
            <p className={styles.note}>
              <BookOpen size={17} aria-hidden />
              {c.guide.note}
            </p>
          </div>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(18, 33, 59, 0.1)", background: "#ffffff", boxShadow: "0 12px 24px -8px rgba(18, 33, 59, 0.08)" }}>
            <Image
              src={c.guide.image}
              alt={c.guide.imageAlt}
              width={768}
              height={512}
              style={{ width: "100%", height: "auto", display: "block" }}
              sizes="(max-width: 768px) 90vw, 480px"
            />
          </div>
        </section>

        {/* 5. 开源与下载专区 (Source & Downloads) */}
        <section
          className={styles.source}
          aria-labelledby="source-title"
          id="source-and-downloads"
        >
          <div>
            <p className={styles.eyebrow}>{c.source.eyebrow}</p>
            <h2 id="source-title">{c.source.title}</h2>
            <p>{c.source.description}</p>
            <p className={styles.note}>{c.source.availability}</p>
          </div>
          <div className={styles.sourceLinks}>
            <BoundaryLink
              href={c.source.cta.href}
              className={styles.secondary}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={23} aria-hidden />
              {c.source.cta.label}
              <ArrowRight size={18} aria-hidden />
            </BoundaryLink>
            <div>
              <BoundaryLink href={c.source.downloadCta.href}>
                {c.source.downloadCta.label}
              </BoundaryLink>
              <BoundaryLink href={c.source.pricingCta.href}>
                {c.source.pricingCta.label}
              </BoundaryLink>
            </div>
          </div>
        </section>

        {/* 6. 企业团队支持 (Team / Enterprise) */}
        {c.team ? (
          <section className={styles.source} aria-label={c.team.title}>
            <div>
              <h2>{c.team.title}</h2>
              <p>{c.team.description}</p>
              <p>
                {c.team.nodesLabel} / {c.team.membersLabel} / {c.team.validityLabel}
              </p>
            </div>
            <BoundaryLink
              className={styles.secondary}
              href={c.team.contactHref}
            >
              {c.team.contactLabel}
            </BoundaryLink>
          </section>
        ) : null}
      </main>

      {/* 底部 Footer */}
      <footer className={styles.footer}>
        <div>
          <BoundaryLink href="/products/xworkmate" className={styles.brand}>
            <Image
              src="/marketing/xworkmate/brand-mark.png"
              alt=""
              width={32}
              height={32}
            />
            {c.hero.title}
          </BoundaryLink>
          <p>{c.navigation.copyright}</p>
        </div>
        <nav aria-label={c.navigation.label}>
          {c.navigation.links.map((link) => (
            <BoundaryLink key={link.href} href={link.href}>
              {link.label}
            </BoundaryLink>
          ))}
        </nav>
        <LanguageToggle size="sm" />
      </footer>
    </div>
  );
}
