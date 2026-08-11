import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import DocsSearch from "@/app/docs/DocsSearch";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

describe("DocsSearch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("opens with the keyboard shortcut and navigates to a result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            slug: "guide/overview",
            title: "Platform overview",
            excerpt: "Start using the platform.",
            collection: "Guide",
            href: "/docs/guide/overview",
          },
        ],
      }),
    );

    render(<DocsSearch />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const input = await screen.findByRole("combobox");
    await userEvent.type(input, "platform");
    await waitFor(() =>
      expect(screen.getByText("Platform overview")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText("Platform overview"));
    expect(push).toHaveBeenCalledWith("/docs/guide/overview");
  });
});
