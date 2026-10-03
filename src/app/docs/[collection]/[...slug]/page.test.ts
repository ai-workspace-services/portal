import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("lucide-react", () => ({ ChevronRight: () => null }));
vi.mock("@/components/doc/DocMetaPanel", () => ({ default: () => null }));
vi.mock("@/components/public/PublicPageShell", () => ({
  PublicPageIntro: () => null,
}));
vi.mock("@lib/featureToggles", () => ({ isFeatureEnabled: () => true }));
vi.mock("@server/contentLanguage", () => ({
  getContentLanguage: async () => "en",
}));
vi.mock("../../Feedback", () => ({ default: () => null }));
vi.mock("../../DocActions", () => ({ default: () => null }));
vi.mock("../../resources.server", () => ({
  getDocVersion: vi.fn(),
}));

import { dynamicParams, generateStaticParams, revalidate } from "./page";

describe("documentation detail route prerendering", () => {
  it("leaves documentation pages for runtime rendering", async () => {
    await expect(generateStaticParams()).resolves.toEqual([]);
    expect(dynamicParams).toBe(true);
    expect(revalidate).toBe(300);
  });
});
