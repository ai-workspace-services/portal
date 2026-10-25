import type { ReferralContent } from "./referral-content";

export type ReferralCampaign = {
  revision: number;
  enabled: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  cashbackBps: number;
  annualBonusDays: number;
};
const date = (value: unknown) =>
  value === null ||
  (typeof value === "string" && Number.isFinite(Date.parse(value)));
export function isReferralCampaign(value: unknown): value is ReferralCampaign {
  const c = value as ReferralCampaign;
  return (
    typeof c?.enabled === "boolean" &&
    typeof c.active === "boolean" &&
    Number.isSafeInteger(c.revision) &&
    date(c.startsAt) &&
    date(c.endsAt) &&
    c.cashbackBps === 1000 &&
    c.annualBonusDays === 30
  );
}
export function campaignAcceptsRegistration(
  c: ReferralCampaign | null,
  now = Date.now(),
): boolean {
  return (
    !!c &&
    c.enabled &&
    c.active &&
    (c.startsAt === null || Date.parse(c.startsAt) <= now) &&
    (c.endsAt === null || now < Date.parse(c.endsAt))
  );
}

/** Preserve reviewed editorial sentences, replacing only runtime date values. */
export function campaignDisplayContent(
  content: ReferralContent,
  campaign: ReferralCampaign | null,
): ReferralContent {
  const formatted = (
    value: string | null | undefined,
    locale: string,
    inclusiveEnd = false,
  ) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          timeZone: "Asia/Shanghai",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: locale === "en-US",
        }).format(new Date(Date.parse(value) - (inclusiveEnd ? 1 : 0)))
      : "—";
  const transform = (value: unknown, language: "zh" | "en"): unknown => {
    if (typeof value === "string") {
      const start = formatted(
        campaign?.startsAt,
        language === "zh" ? "zh-CN" : "en-US",
      );
      const end = formatted(
        campaign?.endsAt,
        language === "zh" ? "zh-CN" : "en-US",
        true,
      );
      return language === "zh"
        ? value
            .replace(/2026 年 10 月 13 日 00:00/g, start)
            .replace(/(?:2026 年 )?12 月 31 日(?: 23:59)?/g, end)
        : value
            .replace(
              /October 13, 2026, 12:00 a\.m\.|12:00 a\.m\. Beijing time on October 13, 2026/g,
              start,
            )
            .replace(
              /December 31, 2026, 11:59 p\.m\.|11:59 p\.m\. Beijing time on December 31, 2026|December 31, 2026/g,
              end,
            );
    }
    if (Array.isArray(value)) return value.map((v) => transform(v, language));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, transform(v, language)]),
      );
    return value;
  };
  return {
    zh: transform(content.zh, "zh"),
    en: transform(content.en, "en"),
  } as ReferralContent;
}
