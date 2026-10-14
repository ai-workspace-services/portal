type Cta = { label: string; href: string };

export type XConnectLocale = {
  navigation: { label: string; links: Cta[]; cta: Cta; copyright: string };
  hero: {
    badge: string;
    title: string;
    headline: string[];
    subtitle: string;
    description: string;
    cta: Cta;
    secondaryCta: Cta;
    downloadUrl: string;
    supportedPlatforms: string;
    image: string;
    imageAlt: string;
    imageCaption: string;
  };
  services: { title: string; names: string[] };
  wizard: {
    title: string;
    description: string;
    steps: { step: number; title: string; description: string; link: string }[];
  };
  diagnostics: {
    eyebrow: string;
    title: string[];
    description: string;
    features: string[];
    image: string;
    imageAlt: string;
    imageCaption: string;
    privacyNote: string;
  };
  guide: {
    eyebrow: string;
    title: string;
    description: string;
    cta: Cta;
    note: string;
    image: string;
    imageAlt: string;
  };
  source: {
    eyebrow: string;
    title: string;
    description: string;
    cta: Cta;
    downloadCta: Cta;
    pricingCta: Cta;
    availability: string;
  };
  sharing: { title: string; description: string; image: string };
};

export type XConnectContent = Record<"zh" | "en", XConnectLocale>;

/** Reject incomplete CMS variants before publishing a generated artifact. */
export function validateXConnectLocale(
  value: unknown,
  context: string,
): asserts value is XConnectLocale {
  const record = value as Record<string, Record<string, unknown>>;
  const fields: Record<string, string[]> = {
    navigation: ["label", "copyright"],
    hero: [
      "badge",
      "title",
      "subtitle",
      "description",
      "downloadUrl",
      "supportedPlatforms",
      "image",
      "imageAlt",
      "imageCaption",
    ],
    services: ["title"],
    wizard: ["title", "description"],
    diagnostics: [
      "eyebrow",
      "description",
      "image",
      "imageAlt",
      "imageCaption",
      "privacyNote",
    ],
    guide: ["eyebrow", "title", "description", "note", "image", "imageAlt"],
    source: ["eyebrow", "title", "description", "availability"],
    sharing: ["title", "description", "image"],
  };
  const fail = (field: string): never => {
    throw new Error(`${context}: invalid ${field}`);
  };
  const string = (v: unknown, field: string) => {
    if (typeof v !== "string" || !v.trim()) fail(field);
  };
  if (!record || typeof record !== "object" || Array.isArray(record))
    fail("content");
  for (const [section, names] of Object.entries(fields)) {
    if (!record[section] || typeof record[section] !== "object") fail(section);
    names.forEach((name) =>
      string(record[section][name], `${section}.${name}`),
    );
  }
  for (const [section, name, count] of [
    ["hero", "headline", 2],
    ["services", "names", 5],
    ["diagnostics", "title", 2],
    ["diagnostics", "features", 3],
  ] as const) {
    const list = record[section][name];
    if (!Array.isArray(list) || list.length !== count)
      fail(`${section}.${name}`);
    (list as unknown[]).forEach((item) => string(item, `${section}.${name}`));
  }
  const href = (v: unknown, field: string) => {
    string(v, field);
    if (!/^(\/(?!\/)|https:\/\/|#[a-zA-Z])/.test(v as string)) fail(field);
  };
  for (const [section, name] of [
    ["navigation", "cta"],
    ["hero", "cta"],
    ["hero", "secondaryCta"],
    ["guide", "cta"],
    ["source", "cta"],
    ["source", "downloadCta"],
    ["source", "pricingCta"],
  ]) {
    const cta = record[section][name] as Cta;
    string(cta?.label, `${section}.${name}.label`);
    href(cta?.href, `${section}.${name}.href`);
  }
  const links = record.navigation.links;
  if (!Array.isArray(links) || links.length !== 3) fail("navigation.links");
  (links as Cta[]).forEach((link) => {
    string(link.label, "navigation.links.label");
    href(link.href, "navigation.links.href");
  });
  const steps = record.wizard.steps;
  if (!Array.isArray(steps) || steps.length !== 3) fail("wizard.steps");
  (steps as XConnectLocale["wizard"]["steps"]).forEach((step, index) => {
    if (step.step !== index + 1) fail("wizard.steps.order");
    string(step.title, "wizard.steps.title");
    string(step.description, "wizard.steps.description");
    href(step.link, "wizard.steps.link");
  });
  for (const section of ["hero", "diagnostics", "guide", "sharing"]) {
    if (!(record[section].image as string).startsWith("/marketing/xconnect/"))
      fail(`${section}.image`);
  }
}
