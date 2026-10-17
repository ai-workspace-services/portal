import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, getDocsHomeContent, getDocCollections } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  getDocsHomeContent: vi.fn(),
  getDocCollections: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, notFound: vi.fn() }));
vi.mock("@/components/public/PublicPageShell", () => ({
  PublicPageIntro: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));
vi.mock("@server/contentLanguage", () => ({
  getContentLanguage: async () => "en",
}));

vi.mock("@/app/docs/resources.server", () => ({
  getDocsHomeContent,
  getDocCollections,
}));

import DocsHomePage from "@/app/docs/page";

const collection = {
  slug: "guide",
  title: "Platform guide",
  description: "Get started with the platform.",
  tags: [],
  versions: [{ slug: "overview", label: "Overview", title: "Overview", description: "", html: "" }],
  defaultVersionSlug: "overview",
  articleCount: 3,
};

describe("/docs home", () => {
  beforeEach(() => {
    redirect.mockClear();
    getDocsHomeContent.mockReset();
    getDocCollections.mockReset();
  });

  it("renders content-service collections on the docs page instead of redirecting", async () => {
    getDocsHomeContent.mockResolvedValue({ title: "Docs", description: "All docs", html: "<p>Welcome</p>" });
    getDocCollections.mockResolvedValue([collection]);

    render(await DocsHomePage());

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("Welcome")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Platform guide/ });
    expect(link.getAttribute("href")).toBe("/docs/guide/overview");
  });

  it("still renders public documentation links when content-service is unreachable", async () => {
    getDocsHomeContent.mockRejectedValue(new Error("unreachable"));
    getDocCollections.mockRejectedValue(new Error("unreachable"));

    render(await DocsHomePage());

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs.some((h) => h?.startsWith("https://github.com/ai-workspace-"))).toBe(true);
  });
});
