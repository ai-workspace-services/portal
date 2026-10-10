"use client";

import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Download,
  LogIn,
  Network,
  UserRound,
} from "lucide-react";
import BoundaryLink from "@/components/common/BoundaryLink";
import LanguageToggle from "@/components/LanguageToggle";
import { Github } from "@/components/icons/brand";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { XConnectContent } from "@/lib/xconnectContent";
import styles from "./XConnectProductView.module.css";

const serviceImages = [
  "openai.svg",
  "claude-color.svg",
  "gemini-color.svg",
  "grok.svg",
];
const stepIcons = [UserRound, Download, LogIn];
const diagnosticIcons = [Activity, Network, Check];

export default function XConnectProductView({
  content,
}: {
  content: XConnectContent;
}) {
  const { language } = useLanguage();
  const c = content[language];
  return (
    <div className={`xds ${styles.page}`}>
      <header className={styles.header}>
        <BoundaryLink href="/products/xconnect" className={styles.brand}>
          <Image
            src="/marketing/xconnect/brand-mark.png"
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
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="xconnect-title">
          <p className={styles.eyebrow}>{c.hero.badge}</p>
          <h1 id="xconnect-title">
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
          <figure className={styles.showcase}>
            <div className={styles.showcaseImage}>
              <Image
                src={c.hero.image}
                alt={c.hero.imageAlt}
                width={1536}
                height={768}
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
              />
            </div>
            <figcaption>{c.hero.imageCaption}</figcaption>
          </figure>
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
        <section className={styles.steps} aria-labelledby="steps-title">
          <div className={styles.stepsHeading}>
            <h2 id="steps-title">{c.wizard.title}</h2>
            <p>{c.wizard.description}</p>
          </div>
          <ol>
            {c.wizard.steps.map((step, index) => {
              const Icon = stepIcons[index];
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
        <section
          className={styles.diagnostics}
          aria-labelledby="diagnostics-title"
        >
          <div className={styles.diagnosticCopy}>
            <p className={styles.eyebrow}>{c.diagnostics.eyebrow}</p>
            <h2 id="diagnostics-title">
              {c.diagnostics.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p>{c.diagnostics.description}</p>
            <ul className={styles.features}>
              {c.diagnostics.features.map((feature, index) => {
                const Icon = diagnosticIcons[index];
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
            <div className={styles.phoneViewport}>
              <Image
                src={c.diagnostics.image}
                alt={c.diagnostics.imageAlt}
                width={768}
                height={1365}
                sizes="(max-width: 768px) 85vw, 420px"
              />
            </div>
            <figcaption>{c.diagnostics.imageCaption}</figcaption>
          </figure>
        </section>
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
          <Image
            src={c.guide.image}
            alt={c.guide.imageAlt}
            width={768}
            height={512}
            sizes="(max-width: 768px) 85vw, 420px"
          />
        </section>
        <section className={styles.source} aria-labelledby="source-title">
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
      </main>
      <footer className={styles.footer}>
        <div>
          <BoundaryLink href="/products/xconnect" className={styles.brand}>
            <Image
              src="/marketing/xconnect/brand-mark.png"
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
