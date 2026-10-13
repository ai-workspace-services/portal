export type ReferralLocale = {
  schemaVersion: number;
  locale: string;
  campaign: {
    id: string;
    startAt: string;
    endAt: string;
    timezone: string;
    cashbackRatePercent: number;
    annualExtensionDays: number;
    settlementHoldDays: number;
  };
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    body: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    campaignWindow: string;
  };
  rewards: {
    title: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
      label: string;
    }>;
    note: string;
    daysUnit: string;
  };
  calculator: {
    title: string;
    description: string;
    fields: {
      invitees: { label: string; hint: string };
      amount: { label: string; hint: string };
      currency: { label: string; hint: string };
      planType: { label: string };
      activeSubscription: { label: string; hint: string };
    };
    planOptions: {
      monthly: { label: string; extensionEligible: boolean };
      annual: { label: string; extensionEligible: boolean };
    };
    result: {
      cashback: string;
      extension: string;
      extensionEligibility: string;
      formula: string;
      disclaimer: string;
    };
  };
  steps: {
    title: string;
    items: Array<{ title: string; description: string }>;
    cta: { label: string; href: string };
  };
  faq: { title: string; items: Array<{ question: string; answer: string }> };
  terms: {
    title: string;
    intro: string;
    sections: Array<{ title: string; body: string }>;
  };
  center: {
    title: string;
    description: string;
    summary: {
      title: string;
      successfulInvites: string;
      cashbackTotal: string;
      cashbackPending: string;
      cashbackAvailable: string;
      cashbackSettled: string;
      extensionDaysTotal: string;
      currencyNote: string;
    };
    link: {
      title: string;
      description: string;
      copy: string;
      copied: string;
      share: string;
      showQr: string;
      hideQr: string;
      loading: string;
      unavailable: string;
    };
    records: {
      title: string;
      columns: {
        invitedAt: string;
        account: string;
        plan: string;
        cashback: string;
        extension: string;
        status: string;
      };
      accountPrivacy: string;
      empty: string;
      loading: string;
      error: string;
      historyLimitNote: string;
    };
    settlements: {
      title: string;
      pending: string;
      available: string;
      settled: string;
      review: string;
      reviewNote: string;
      request: string;
      requestUnavailable: string;
      history: string;
      empty: string;
      error: string;
    };
    extensions: {
      title: string;
      columns: {
        invite: string;
        days: string;
        appliedAt: string;
        before: string;
        after: string;
        status: string;
      };
      empty: string;
      error: string;
    };
    statuses: {
      pending: string;
      hold: string;
      available: string;
      review: string;
      settled: string;
      applied: string;
      reversed: string;
      rejected: string;
    };
    actions: { retry: string; refresh: string; signIn: string };
    emptyStates: { summary: string; link: string };
    errors: {
      unauthorized: string;
      forbidden: string;
      network: string;
      settlement: string;
      copy: string;
    };
  };
};
export type ReferralContent = Record<"zh" | "en", ReferralLocale>;

export function validateReferralLocale(
  value: unknown,
  context: string,
): asserts value is ReferralLocale {
  const c = value as ReferralLocale;
  if (
    c?.schemaVersion !== 1 ||
    !["zh", "en"].includes(c?.locale) ||
    c?.campaign?.cashbackRatePercent !== 10 ||
    c?.campaign?.annualExtensionDays !== 30 ||
    c?.campaign?.settlementHoldDays !== 7
  )
    throw new Error(`${context}: invalid referral campaign contract`);
  for (const key of [
    "seo",
    "hero",
    "rewards",
    "calculator",
    "steps",
    "faq",
    "terms",
    "center",
  ] as const)
    if (!c[key] || typeof c[key] !== "object")
      throw new Error(`${context}: missing ${key}`);
  for (const path of [
    "rewards.daysUnit",
    "seo.title",
    "seo.description",
    "seo.ogTitle",
    "seo.ogDescription",
    "seo.ogImage",
    "hero.title",
    "hero.primaryCta.label",
    "hero.primaryCta.href",
    "hero.secondaryCta.label",
    "hero.secondaryCta.href",
    "calculator.fields.currency.label",
    "calculator.fields.activeSubscription.label",
    "calculator.fields.invitees.label",
    "calculator.fields.amount.label",
    "calculator.fields.planType.label",
    "calculator.result.disclaimer",
    "center.title",
    "center.link.copy",
    "center.errors.unauthorized",
    "center.records.empty",
    "center.extensions.empty",
    "center.settlements.request",
  ]) {
    const field = path
      .split(".")
      .reduce<unknown>(
        (record, key) =>
          record && typeof record === "object"
            ? (record as Record<string, unknown>)[key]
            : undefined,
        c,
      );
    if (typeof field !== "string" || !field.trim())
      throw new Error(`${context}: missing ${path}`);
  }
  if (
    c.rewards.items.some(
      (item) =>
        !item.label?.trim() || !item.title?.trim() || !item.description?.trim(),
    )
  )
    throw new Error(`${context}: incomplete reward card`);
  if (
    !c.hero.title ||
    !c.center.title ||
    !c.faq.items?.length ||
    !c.terms.sections?.length ||
    c.rewards.items?.length !== 2 ||
    c.steps.items?.length !== 3
  )
    throw new Error(`${context}: incomplete referral copy`);
}
