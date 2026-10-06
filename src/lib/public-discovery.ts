import {
  COMPANY_LEGAL_NAME,
  COMPANY_SITE_URL,
  COMPANY_SUPPORT_EMAIL,
  PRODUCT_SOURCES,
} from "./company";

export type LocalizedText = { zh: string; en: string };
export type DiscoveryProduct = {
  slug: string;
  sourceSlug?: string;
  showInOverview?: boolean;
  name: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  cta: LocalizedText;
  problem: LocalizedText;
  how: LocalizedText;
};
export type PublicDiscovery = {
  schemaVersion: number;
  companyDescription: string;
  footerLabel: LocalizedText;
  labels: Record<
    | "officialPage"
    | "website"
    | "support"
    | "products"
    | "publicResources"
    | "availabilityPricing"
    | "downloads",
    LocalizedText
  >;
  resources: Array<{ href: string; label: LocalizedText }>;
  sections: Record<
    "what" | "problem" | "how" | "availability" | "pricing" | "sources",
    LocalizedText
  >;
  availability: LocalizedText;
  pricing: LocalizedText;
  products: DiscoveryProduct[];
};

export function validateDiscovery(
  value: unknown,
): asserts value is PublicDiscovery {
  const data = value as PublicDiscovery;
  const localized = (text: LocalizedText) => {
    if (
      !text ||
      [text.zh, text.en].some(
        (item) => typeof item !== "string" || !item.trim(),
      )
    ) {
      throw new Error("Discovery content requires both zh and en text");
    }
  };
  if (
    !data ||
    data.schemaVersion !== 1 ||
    typeof data.companyDescription !== "string" ||
    !data.companyDescription.trim()
  ) {
    throw new Error("Invalid discovery content schema");
  }
  localized(data.footerLabel);
  for (const key of [
    "officialPage",
    "website",
    "support",
    "products",
    "publicResources",
    "availabilityPricing",
    "downloads",
  ] as const)
    localized(data.labels?.[key]);
  localized(data.availability);
  localized(data.pricing);
  for (const key of [
    "what",
    "problem",
    "how",
    "availability",
    "pricing",
    "sources",
  ] as const)
    localized(data.sections?.[key]);
  if (
    !Array.isArray(data.products) ||
    !data.products.length ||
    !Array.isArray(data.resources)
  )
    throw new Error("Missing discovery catalog");
  const slugs = new Set<string>();
  for (const product of data.products) {
    if (
      !/^[a-z0-9-]+$/.test(product.slug) ||
      slugs.has(product.slug) ||
      !PRODUCT_SOURCES[product.sourceSlug ?? product.slug]
    )
      throw new Error("Invalid or duplicate discovery product");
    slugs.add(product.slug);
    for (const key of [
      "name",
      "title",
      "description",
      "cta",
      "problem",
      "how",
    ] as const)
      localized(product[key]);
  }
  for (const resource of data.resources) {
    if (
      !/^\/(?:products|docs|blogs|prices|download|about|company|contact|support|privacy|terms)$/.test(
        resource.href,
      )
    )
      throw new Error("Discovery resources must be public canonical routes");
    localized(resource.label);
  }
}

export function productMarkdown(
  data: PublicDiscovery,
  product: DiscoveryProduct,
  locale: "zh" | "en",
): string {
  const href = `${COMPANY_SITE_URL}/products/${product.slug}`;
  const sources = PRODUCT_SOURCES[product.sourceSlug ?? product.slug];
  const sections = [
    [data.sections.what[locale], product.description[locale]],
    [data.sections.problem[locale], product.problem[locale]],
    [data.sections.how[locale], product.how[locale]],
    [
      data.sections.availability[locale],
      `${data.availability[locale]}\n\n[${data.labels.downloads[locale]}](${COMPANY_SITE_URL}/download)`,
    ],
    [
      data.sections.pricing[locale],
      `${data.pricing[locale]}\n\n[${data.sections.pricing[locale]}](${COMPANY_SITE_URL}/prices)`,
    ],
    [
      data.sections.sources[locale],
      [...sources.repositories, ...sources.downloads]
        .map((link) => `- [${link.label}](${link.href})`)
        .join("\n"),
    ],
  ];
  return `# ${product.name[locale]}\n\n${product.title[locale]}\n\n[${data.labels.officialPage[locale]}](${href}) · ${COMPANY_LEGAL_NAME}\n\n${sections.map(([title, body]) => `## ${title}\n\n${body}`).join("\n\n")}\n`;
}

export function llmsIndex(data: PublicDiscovery): string {
  return `# ${COMPANY_LEGAL_NAME}\n\n> ${data.companyDescription}\n\n${data.labels.website.en}: ${COMPANY_SITE_URL}\n${data.labels.support.en}: ${COMPANY_SUPPORT_EMAIL}\n\n## ${data.labels.products.en}\n\n${data.products.map((product) => `- [${product.name.en}](${COMPANY_SITE_URL}/products/${product.slug}.en.md): ${product.description.en}\n  - [${data.labels.officialPage.en}](${COMPANY_SITE_URL}/products/${product.slug}) · [中文](${COMPANY_SITE_URL}/products/${product.slug}.md)`).join("\n")}\n\n## ${data.labels.publicResources.en}\n\n${data.resources.map((resource) => `- [${resource.label.en}](${COMPANY_SITE_URL}${resource.href})`).join("\n")}\n\n## ${data.labels.availabilityPricing.en}\n\n${data.availability.en}\n\n${data.pricing.en}\n`;
}
