"use client";

import Image from "next/image";
import { ArrowRight, Layers } from "lucide-react";
import BoundaryLink from "@/components/common/BoundaryLink";
import MarketingNav from "@/components/marketing/MarketingNav";
import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
import { useLanguage } from "@/i18n/LanguageProvider";
import { publicDiscovery } from "@/data/content/public-discovery";
import styles from "./ProductCatalog.module.css";

const PRODUCT_ORDER = ["xworkmate", "xconnect", "ai-workspace"];
const PRODUCT_MARKS: Record<string, string> = {
  xworkmate: "/marketing/xworkmate/brand-mark.png",
  xconnect: "/marketing/xconnect/brand-mark.png",
  "ai-workspace": "/marketing/ai-workspace/brand-mark.png",
};

export function ProductCards({ locale }: { locale: "zh" | "en" }) {
  return (
    <div className={styles.productGrid}>
      {PRODUCT_ORDER.map((slug, index) => {
        const product = publicDiscovery.products.find(
          (item) => item.slug === slug,
        )!;
        return (
          <article key={slug} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.icon}>
                <Image
                  src={PRODUCT_MARKS[slug]}
                  alt=""
                  width={36}
                  height={36}
                  style={{ objectFit: "contain" }}
                />
              </span>
              <span className={styles.number}>0{index + 1}</span>
            </div>
            <h3>{product.name[locale]}</h3>
            <p className={styles.cardTitle}>{product.title[locale]}</p>
            <p className={styles.description}>{product.description[locale]}</p>
            <BoundaryLink
              aria-label={`${publicDiscovery.overview.productCta[locale]} ${product.name[locale]}`}
              href={`/products/${slug}`}
              className={styles.textLink}
            >
              {publicDiscovery.overview.productCta[locale]}
              <ArrowRight size={16} aria-hidden="true" />
            </BoundaryLink>
          </article>
        );
      })}
    </div>
  );
}

export default function ProductOverview() {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : "zh";
  const copy = publicDiscovery.overview;
  const solution = publicDiscovery.products.find(
    (item) => item.kind === "solution",
  )!;
  return (
    <div className={`xds ${styles.page}`}>
      <MarketingNav />
      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <p className={styles.eyebrow}>{copy.eyebrow[locale]}</p>
            <h1>{copy.title[locale]}</h1>
            <p className={styles.lead}>{copy.description[locale]}</p>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="products-title">
          <div className={styles.container}>
            <p className={styles.eyebrow}>{copy.productsLabel[locale]}</p>
            <h2 id="products-title">{copy.productsTitle[locale]}</h2>
            <ProductCards locale={locale} />
          </div>
        </section>
        <section
          className={styles.solutionSection}
          aria-labelledby="solution-title"
        >
          <div className={styles.container}>
            <p className={styles.eyebrow}>{copy.solutionLabel[locale]}</p>
            <h2 id="solution-title">{copy.solutionTitle[locale]}</h2>
            <article className={styles.solutionCard}>
              <div className={styles.solutionMark}>
                <Layers size={38} aria-hidden="true" />
              </div>
              <div>
                <h3>{solution.name[locale]}</h3>
                <p className={styles.cardTitle}>{solution.title[locale]}</p>
                <p className={styles.description}>
                  {solution.description[locale]}
                </p>
              </div>
              <BoundaryLink
                href="/products/open-platform"
                className={styles.primaryLink}
              >
                {solution.cta[locale]}
                <ArrowRight size={16} aria-hidden="true" />
              </BoundaryLink>
            </article>
          </div>
        </section>
        <section className={styles.section}>
          <div className={`${styles.container} ${styles.closing}`}>
            <div>
              <p className={styles.eyebrow}>{copy.downloadsLabel[locale]}</p>
              <h2>{copy.downloadsTitle[locale]}</h2>
            </div>
            <div className={styles.actions}>
              <BoundaryLink href="/download" className={styles.primaryLink}>
                {copy.downloadsCta[locale]}
              </BoundaryLink>
              <BoundaryLink href="/github" className={styles.secondaryLink}>
                GitHub
              </BoundaryLink>
            </div>
          </div>
        </section>
      </main>
      <XdsSiteFooter brand="XWork Technologies" catalogMode />
    </div>
  );
}
