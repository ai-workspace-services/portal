"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock,
  Download,
  Gift,
  Link as LinkIcon,
  UserRound,
} from "lucide-react";
import BoundaryLink from "@/components/common/BoundaryLink";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useReferralAttribution } from "@/state/referral-attribution";
import { useUserStore } from "@/lib/userStore";
import type { ReferralContent } from "@/lib/referral-content";
import type { XConnectContent } from "@/lib/xconnectContent";
import {
  calculateReferralEstimate,
  formatReferralMoney,
} from "@/lib/referral-calculator";
import styles from "./Referrals.module.css";

const icons = [UserRound, Download, LinkIcon];
export default function ReferralLanding({
  content,
  product,
}: {
  content: ReferralContent;
  product: XConnectContent;
}) {
  const { language } = useLanguage();
  const c = content[language];
  const p = product[language];
  const user = useUserStore((s) => s.user);
  const referralCode = useReferralAttribution((s) => s.referralCode);
  const captureLocation = useReferralAttribution((s) => s.captureLocation);
  useEffect(() => {
    captureLocation();
  }, [captureLocation]);
  const [invitees, setInvitees] = useState(3);
  const [amount, setAmount] = useState(365);
  const [annual, setAnnual] = useState(true);
  const [active, setActive] = useState(false);
  const [currency, setCurrency] = useState("CNY");
  const estimate = calculateReferralEstimate(
    invitees,
    Math.round(amount * 100),
    annual,
    active,
  );
  const cta = user
    ? c.hero.secondaryCta
    : {
        ...c.hero.primaryCta,
        href: referralCode
          ? `/register?ref=${encodeURIComponent(referralCode)}`
          : c.hero.primaryCta.href,
      };
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BoundaryLink href="/products/xconnect" className={styles.brand}>
          <Image
            src="/marketing/xconnect/brand-mark.png"
            width={34}
            height={34}
            alt=""
          />
          XConnect
        </BoundaryLink>
        <nav aria-label={p.navigation.label}>
          {p.navigation.links.map((link) => (
            <BoundaryLink
              href={
                link.href.startsWith("#")
                  ? `/products/xconnect${link.href}`
                  : link.href
              }
              key={link.href}
            >
              {link.label}
            </BoundaryLink>
          ))}
        </nav>
        <div className={styles.actions}>
          <LanguageToggle size="md" />
          <BoundaryLink href={cta.href} className={styles.primary}>
            {cta.label}
          </BoundaryLink>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="referral-title">
          <div className={styles.heroMeta}>
            <span className={styles.eyebrow}>
              <Gift size={17} aria-hidden />
              {c.hero.eyebrow}
            </span>
            <span>
              <Clock size={16} aria-hidden />
              {c.hero.campaignWindow}
            </span>
          </div>
          <h1 id="referral-title">{c.hero.title}</h1>
          <p className={styles.subtitle}>{c.hero.subtitle}</p>
          <div className={styles.rewards} aria-label={c.rewards.title}>
            {c.rewards.items.map((reward, i) => (
              <article
                key={reward.id}
                className={styles.reward}
                aria-label={reward.title}
              >
                <div>
                  <h2 className={styles.rewardTag}>{reward.label}</h2>
                  <strong>
                    {i === 0
                      ? `${c.campaign.cashbackRatePercent}%`
                      : `+${c.campaign.annualExtensionDays}`}
                    {i === 1 && <small> {c.rewards.daysUnit}</small>}
                  </strong>
                </div>
                <Image
                  src={`/marketing/referral/${i === 0 ? "cashback" : "annual-bonus"}.png`}
                  width={140}
                  height={140}
                  alt=""
                  className={styles.rewardImage}
                />
                <p>{reward.description}</p>
              </article>
            ))}
          </div>
          <div className={styles.heroButtons}>
            <BoundaryLink className={styles.primary} href={cta.href}>
              {cta.label}
              <ArrowRight size={18} aria-hidden />
            </BoundaryLink>
            <a className={styles.secondary} href="#referral-terms">
              {c.terms.title}
            </a>
          </div>
          <figure className={styles.showcase}>
            <Image
              src={p.hero.image}
              alt={p.hero.imageAlt}
              width={1536}
              height={768}
              priority
              sizes="(max-width: 700px) 100vw, 800px"
            />
            <figcaption>{p.hero.imageCaption}</figcaption>
          </figure>
          <p className={styles.heroBody}>{c.hero.body}</p>
        </section>
        <section
          className={`${styles.panel} ${styles.calculator}`}
          aria-labelledby="calculator-title"
        >
          <div>
            <h2 id="calculator-title">{c.calculator.title}</h2>
            <p className={styles.muted}>{c.calculator.description}</p>
            <div className={styles.inputs}>
              <label>
                {c.calculator.fields.invitees.label}
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  value={invitees}
                  onChange={(e) => setInvitees(Number(e.target.value))}
                />
              </label>
              <label>
                {c.calculator.fields.amount.label}
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <label>
                {c.calculator.fields.currency.label}
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option>CNY</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </label>
              <label>
                {c.calculator.fields.planType.label}
                <select
                  value={annual ? "annual" : "monthly"}
                  onChange={(e) => setAnnual(e.target.value === "annual")}
                >
                  <option value="monthly">
                    {c.calculator.planOptions.monthly.label}
                  </option>
                  <option value="annual">
                    {c.calculator.planOptions.annual.label}
                  </option>
                </select>
              </label>
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              {c.calculator.fields.activeSubscription.label}
            </label>
          </div>
          <div className={styles.estimate} aria-live="polite">
            <span>{c.calculator.result.cashback}</span>
            <strong>
              {formatReferralMoney(estimate.cashbackMinor, currency, language)}
            </strong>
            <span>{c.calculator.result.extension}</span>
            <b>+{estimate.extensionDays}</b>
            <p>{c.calculator.result.extensionEligibility}</p>
          </div>
          <p className={styles.calculatorNote}>
            {c.calculator.result.formula}
            <br />
            {c.calculator.result.disclaimer}
          </p>
        </section>
        <section className={styles.steps} aria-labelledby="steps-title">
          <h2 id="steps-title">{c.steps.title}</h2>
          <div>
            {c.steps.items.map((step, i) => {
              const Icon = icons[i];
              return (
                <article key={step.title}>
                  <span className={styles.stepIcon}>
                    <Icon size={27} aria-hidden />
                  </span>
                  <h3>
                    {i + 1}. {step.title}
                  </h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>
          <BoundaryLink className={styles.primary} href={c.steps.cta.href}>
            {c.steps.cta.label}
            <ArrowRight size={17} aria-hidden />
          </BoundaryLink>
        </section>
        <section className={styles.faq} aria-labelledby="faq-title">
          <h2 id="faq-title">{c.faq.title}</h2>
          {c.faq.items.map((f) => (
            <details key={f.question}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
        <section
          id="referral-terms"
          className={styles.terms}
          aria-labelledby="terms-title"
        >
          <h2 id="terms-title">{c.terms.title}</h2>
          <p>{c.terms.intro}</p>
          {c.terms.sections.map((t) => (
            <article key={t.title}>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className={styles.footer}>
        {p.navigation.copyright}
        <BoundaryLink href="/products/xconnect">XConnect</BoundaryLink>
      </footer>
    </div>
  );
}
