// Public company identity shown on every brand-domain page. Keep these in one
// place so the footer, contact surfaces, and product pages cannot drift apart
// (the site previously showed a legacy copyright owner and personal mailboxes).

export const COMPANY_LEGAL_NAME = "XWork Technologies LLC";
export const COMPANY_BRAND_NAME = "XWork";
export const COMPANY_SITE_URL = "https://xworktech.com";
export const COMPANY_SUPPORT_EMAIL = "support@xworktech.com";
export const COMPANY_CONTACT_EMAIL = "haitaopan@xworktech.com";
export const COMPANY_GITHUB_URL = "https://github.com/ai-workspace-lab";
export const COMPANY_COPYRIGHT_YEAR = 2026;

export function getCompanyCopyright(year: number = COMPANY_COPYRIGHT_YEAR): string {
  return `© ${year} ${COMPANY_LEGAL_NAME}`;
}

export type ProductSourceLink = {
  label: string;
  href: string;
};

export type ProductSources = {
  repositories: ProductSourceLink[];
  downloads: ProductSourceLink[];
};

const repo = (fullName: string): ProductSourceLink => ({
  label: fullName,
  href: `https://github.com/${fullName}`,
});

const latestRelease = (fullName: string, label: string): ProductSourceLink => ({
  label,
  href: `https://github.com/${fullName}/releases/latest`,
});

// Source repositories and release artifacts per product page. Every entry is a
// public GitHub repository; downloads point at GitHub Releases so the artifact,
// its checksum, and the commit it was built from are visible side by side.
export const PRODUCT_SOURCES: Record<string, ProductSources> = {
  xworkmate: {
    repositories: [
      repo("ai-workspace-lab/xworkmate-app"),
      repo("ai-workspace-lab/xworkmate-bridge"),
      repo("ai-workspace-lab/xworkspace-core-skills"),
      repo("ai-workspace-lab/openclaw-multi-session-plugins"),
    ],
    downloads: [
      latestRelease("ai-workspace-lab/xworkmate-app", "XWorkmate App (macOS / Windows / Linux / Android)"),
      latestRelease("ai-workspace-lab/xworkmate-bridge", "XWorkmate Bridge runtime"),
    ],
  },
  xconnect: {
    repositories: [
      repo("ai-workspace-xstream/xconnect-app"),
      repo("ai-workspace-xstream/xconnect-one"),
      repo("ai-workspace-xstream/xconnect-gateway"),
      repo("ai-workspace-xstream/xconnect-edge-agent"),
    ],
    downloads: [
      latestRelease("ai-workspace-xstream/xconnect-app", "XConnect App (macOS / Windows / Linux / Android / iOS)"),
      latestRelease("ai-workspace-xstream/xconnect-one", "XConnect One"),
    ],
  },
  "ai-workspace": {
    repositories: [
      repo("ai-workspace-services/portal"),
      repo("ai-workspace-services/accounts"),
      repo("ai-workspace-services/gateway"),
    ],
    downloads: [latestRelease("ai-workspace-services/portal", "AI Workspace Portal release")],
  },
  "open-platform": {
    repositories: [
      repo("ai-workspace-services/portal"),
      repo("ai-workspace-services/accounts"),
      repo("ai-workspace-infra/platform-ops-toolkit"),
      repo("ai-workspace-infra/iac_modules"),
    ],
    downloads: [latestRelease("ai-workspace-infra/platform-ops-toolkit", "Platform Ops Toolkit release")],
  },
  "global-mesh": {
    repositories: [repo("ai-workspace-infra/global-mesh")],
    downloads: [],
  },
};
