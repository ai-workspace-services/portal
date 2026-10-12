"use client";

import { ArrowRight, Layers, ShieldCheck, Activity } from "lucide-react";
import BoundaryLink from "@/components/common/BoundaryLink";
import MarketingNav from "@/components/marketing/MarketingNav";
import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import { useLanguage } from "@/i18n/LanguageProvider";
import { publicDiscovery } from "@/data/content/public-discovery";
import openPlatformData from "@/data/content/open-platform.json";
import { ProductCards } from "./ProductOverview";
import styles from "./ProductCatalog.module.css";

const CAPABILITY_ICONS = [Layers, ShieldCheck, Activity];

export default function OpenPlatformSolutionView() {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : "zh";
  const product = openPlatformData[locale];
  const copy = publicDiscovery.overview;
  return (
    <div className={`xds ${styles.page}`}>
      <MarketingNav />
      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{product.hero.badge}</p>
            <h1>{product.hero.title}</h1>
            <p className={styles.lead}>{product.hero.subtitle}</p>
            <div className={styles.actions}>
              <BoundaryLink
                href={product.hero.cta.href}
                className={styles.primaryLink}
              >
                {product.hero.cta.label}
                <ArrowRight size={16} aria-hidden="true" />
              </BoundaryLink>
              <BoundaryLink href="/products" className={styles.secondaryLink}>
                {copy.backCta[locale]}
              </BoundaryLink>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{copy.architectureLabel[locale]}</p>
            <h2>{copy.architectureTitle[locale]}</h2>
            <div className={styles.capabilityGrid}>
              {product.showcases.map((item, index) => {
                const Icon = CAPABILITY_ICONS[index] ?? Layers;
                return (
                  <article key={item.title} className={styles.card}>
                    <span className={styles.icon}>
                      <Icon size={24} aria-hidden="true" />
                    </span>
                    <h3 className="mt-6">{item.title}</h3>
                    <p className={styles.description}>{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
        <section className={styles.solutionSection}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{copy.journeyLabel[locale]}</p>
            <h2>{product.wizard.title}</h2>
            <p className={`${styles.lead} mb-8`}>
              {product.wizard.description}
            </p>
            <ol className={styles.steps}>
              {product.wizard.steps.map((step) => (
                <li key={step.step}>
                  <span className={styles.number}>0{step.step}</span>
                  <h3>{step.title}</h3>
                  <p className={styles.description}>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.container}>
            <h2>{copy.pathsTitle[locale]}</h2>
            <div className={styles.resourceGrid}>
              {product.solutions.map((group) => (
                <article key={group.title} className={styles.card}>
                  <h3>{group.title}</h3>
                  <p className={styles.description}>{group.description}</p>
                  <ul>
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <BoundaryLink
                          href={link.href}
                          className={styles.textLink}
                        >
                          {link.label}
                          <ArrowRight size={16} aria-hidden="true" />
                        </BoundaryLink>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className={styles.solutionSection}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{copy.productsLabel[locale]}</p>
            <h2>{copy.relatedTitle[locale]}</h2>
            <p className={`${styles.lead} mb-8`}>
              {copy.relatedDescription[locale]}
            </p>
            <ProductCards locale={locale} />
          </div>
        </section>
        <section className={styles.section}>
          <div className={`${styles.container} ${styles.closing}`}>
            <div>
              <h2>{copy.closingTitle[locale]}</h2>
              <p className={styles.description}>
                {copy.closingDescription[locale]}
              </p>
            </div>
            <BoundaryLink
              href="/docs/reference/index"
              className={styles.primaryLink}
            >
              {copy.docsCta[locale]}
              <ArrowRight size={16} aria-hidden="true" />
            </BoundaryLink>
          </div>
        </section>
      </main>
      <XdsSiteFooter brand="XWork Technologies" catalogMode />
    </div>
  );
}
