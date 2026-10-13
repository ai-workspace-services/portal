"use client";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { Copy, Share2, QrCode, RefreshCw } from "lucide-react";
import BoundaryLink from "@/components/common/BoundaryLink";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/i18n/LanguageProvider";
import { translations } from "@/i18n/translations";
import type { ReferralContent } from "@/lib/referral-content";
import { type ReferralOverview, isReferralOverview } from "@/lib/referral-api";
import { formatReferralMoney } from "@/lib/referral-calculator";
import styles from "./Referrals.module.css";

export default function ReferralCenter({
  content,
}: {
  content: ReferralContent;
}) {
  const { language } = useLanguage();
  const c = content[language].center;
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<
    "unauthorized" | "forbidden" | "network" | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/referrals", {
        credentials: "include",
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        setOverview(null);
        setError(
          response.status === 401
            ? "unauthorized"
            : response.status === 403
              ? "forbidden"
              : "network",
        );
        return;
      }
      const payload: unknown = await response.json();
      if (!isReferralOverview(payload))
        throw new Error("invalid_referral_response");
      setOverview(payload);
    } catch (e) {
      if (!signal?.aborted) {
        setOverview(null);
        setError("network");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    setCopied(false);
    setQr(null);
    setQrVisible(false);
  }, [overview?.inviteUrl]);
  const money = (minor: number, currency: string) =>
    formatReferralMoney(minor, currency, language);
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Shanghai",
        }).format(new Date(value))
      : "—";
  const status = (value: string) =>
    c.statuses[
      value === "paid"
        ? "settled"
        : value === "pending_review"
          ? "review"
          : value === "eligible"
            ? "available"
            : (value as keyof typeof c.statuses)
    ] ?? value;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overview!.inviteUrl);
      setCopied(true);
      setActionError(null);
    } catch {
      setActionError(c.errors.copy);
    }
  };
  const share = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          title: content[language].seo.title,
          url: overview!.inviteUrl,
        });
      else await copy();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setActionError(c.errors.copy);
    }
  };
  const toggleQr = async () => {
    if (qrVisible) {
      setQrVisible(false);
      return;
    }
    try {
      const { toDataURL } = await import("qrcode");
      setQr(await toDataURL(overview!.inviteUrl, { width: 220, margin: 2 }));
      setQrVisible(true);
    } catch {
      setActionError(c.link.unavailable);
    }
  };
  const requestSettlement = async (currency: string) => {
    setSettling(currency);
    setSettlementError(false);
    try {
      const response = await fetch("/api/auth/referrals/settlements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      if (!response.ok) throw new Error("settlement_failed");
      await refresh();
    } catch {
      setSettlementError(true);
    } finally {
      setSettling(null);
    }
  };
  const sums = (
    field: "earnedMinor" | "pendingMinor" | "eligibleMinor" | "settledMinor",
  ) =>
    overview!.stats.cashByCurrency.length ? (
      overview!.stats.cashByCurrency.map((cash) => (
        <strong key={cash.currency}>{money(cash[field], cash.currency)}</strong>
      ))
    ) : (
      <strong>—</strong>
    );
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
        <div className={styles.actions}>
          <LanguageToggle size="md" />
          <BoundaryLink href="/panel/account" className={styles.secondary}>
            {translations[language].userCenter.items.accounts}
          </BoundaryLink>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.centerTitle}>
          <div>
            <h1>{c.title}</h1>
            <p>{c.description}</p>
          </div>
          <button
            className={styles.button}
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={16} aria-hidden />
            {c.actions.refresh}
          </button>
        </div>
        {loading && (
          <p role="status" className={styles.empty}>
            {c.records.loading}
          </p>
        )}
        {error && (
          <div role="alert" className={styles.error}>
            <p>{c.errors[error]}</p>
            {error === "unauthorized" ? (
              <BoundaryLink
                href="/login?redirect=%2Freferrals"
                className={styles.primary}
              >
                {c.actions.signIn}
              </BoundaryLink>
            ) : (
              <button className={styles.button} onClick={() => void refresh()}>
                {c.actions.retry}
              </button>
            )}
          </div>
        )}
        {overview && !error && (
          <>
            <section aria-label={c.summary.title}>
              <div className={styles.statGrid}>
                <article className={styles.stat}>
                  <span>{c.summary.successfulInvites}</span>
                  <strong>{overview.stats.successfulInvites}</strong>
                </article>
                <article className={styles.stat}>
                  <span>{c.summary.cashbackTotal}</span>
                  {sums("earnedMinor")}
                </article>
                <article className={styles.stat}>
                  <span>{c.summary.cashbackAvailable}</span>
                  {sums("eligibleMinor")}
                </article>
                <article className={styles.stat}>
                  <span>{c.summary.extensionDaysTotal}</span>
                  <strong>{overview.stats.awardedDays}</strong>
                </article>
              </div>
              <p className={styles.muted}>{c.summary.currencyNote}</p>
              {overview.historyHasMore &&
                Object.values(overview.historyHasMore).some(Boolean) && (
                  <p className={styles.muted}>{c.records.historyLimitNote}</p>
                )}
            </section>
            <section className={`${styles.panel} ${styles.centerSection}`}>
              <h2>{c.link.title}</h2>
              <p className={styles.muted}>{c.link.description}</p>
              {overview.inviteUrl ? (
                <>
                  <div className={styles.linkBox}>
                    <input
                      aria-label={c.link.title}
                      readOnly
                      value={overview.inviteUrl}
                    />
                    <button
                      className={styles.primary}
                      onClick={() => void copy()}
                    >
                      <Copy size={16} aria-hidden />
                      {copied ? c.link.copied : c.link.copy}
                    </button>
                    <button
                      className={styles.button}
                      onClick={() => void share()}
                    >
                      <Share2 size={16} aria-hidden />
                      {c.link.share}
                    </button>
                    <button
                      className={styles.button}
                      onClick={() => void toggleQr()}
                    >
                      <QrCode size={16} aria-hidden />
                      {qrVisible ? c.link.hideQr : c.link.showQr}
                    </button>
                  </div>
                  {qrVisible && qr && (
                    <Image
                      className={styles.qr}
                      src={qr}
                      alt={c.link.title}
                      width={220}
                      height={220}
                      unoptimized
                    />
                  )}
                  {actionError && (
                    <p role="alert" className={styles.error}>
                      {actionError}
                    </p>
                  )}
                </>
              ) : (
                <p className={styles.empty}>{c.link.unavailable}</p>
              )}
            </section>
            <section className={`${styles.panel} ${styles.centerSection}`}>
              <h2>{c.records.title}</h2>
              <p className={styles.muted}>{c.records.accountPrivacy}</p>
              {overview.referrals.length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {[
                          "invitedAt",
                          "account",
                          "plan",
                          "cashback",
                          "status",
                        ].map((k) => (
                          <th key={k} scope="col">
                            {
                              c.records.columns[
                                k as keyof typeof c.records.columns
                              ]
                            }
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.referrals.map((r, i) => (
                        <tr key={`${r.createdAt}-${i}`}>
                          <td>{date(r.createdAt)}</td>
                          <td>{r.invitee}</td>
                          <td>
                            {r.planType === "year"
                              ? content[language].calculator.planOptions.annual
                                  .label
                              : r.planType === "month"
                                ? content[language].calculator.planOptions
                                    .monthly.label
                                : "—"}
                          </td>
                          <td>{money(r.rewardMinor, r.currency)}</td>
                          <td>
                            <span className={styles.badge}>
                              {status(r.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.empty}>{c.records.empty}</p>
              )}
            </section>
            <section className={`${styles.panel} ${styles.centerSection}`}>
              <h2>{c.settlements.title}</h2>
              <div className={styles.settlementGrid}>
                {(
                  ["pendingMinor", "eligibleMinor", "settledMinor"] as const
                ).map((field, i) => (
                  <article className={styles.stat} key={field}>
                    <span>
                      {
                        [
                          c.settlements.pending,
                          c.settlements.available,
                          c.settlements.settled,
                        ][i]
                      }
                    </span>
                    {sums(field)}
                  </article>
                ))}
              </div>
              <p className={styles.muted}>{c.settlements.reviewNote}</p>
              {overview.stats.cashByCurrency
                .filter((cash) => cash.eligibleMinor > 0)
                .map((cash) => (
                  <button
                    className={styles.button}
                    key={cash.currency}
                    disabled={settling !== null}
                    onClick={() => void requestSettlement(cash.currency)}
                  >
                    {c.settlements.request} · {cash.currency}
                  </button>
                ))}
              {settlementError && (
                <p role="alert" className={styles.error}>
                  {c.errors.settlement}
                </p>
              )}
              <h3>{c.settlements.history}</h3>
              {overview.settlements.length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{c.extensions.columns.appliedAt}</th>
                        <th>{c.records.columns.cashback}</th>
                        <th>{c.records.columns.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.settlements.map((s) => (
                        <tr key={s.id}>
                          <td>{date(s.requestedAt)}</td>
                          <td>{money(s.amountMinor, s.currency)}</td>
                          <td>{status(s.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.empty}>{c.settlements.empty}</p>
              )}
            </section>
            <section className={`${styles.panel} ${styles.centerSection}`}>
              <h2>{c.extensions.title}</h2>
              {overview.extensions.length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {["days", "appliedAt", "before", "after", "status"].map(
                          (k) => (
                            <th key={k}>
                              {
                                c.extensions.columns[
                                  k as keyof typeof c.extensions.columns
                                ]
                              }
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.extensions.map((e, i) => (
                        <tr key={`${e.createdAt}-${i}`}>
                          <td>{e.days}</td>
                          <td>{date(e.createdAt)}</td>
                          <td>{date(e.effectiveFrom)}</td>
                          <td>{date(e.effectiveUntil)}</td>
                          <td>{status(e.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.empty}>{c.extensions.empty}</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
