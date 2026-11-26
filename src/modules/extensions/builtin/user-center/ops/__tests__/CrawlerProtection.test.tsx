import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CrawlerProtection from "../components/CrawlerProtection";

describe("CrawlerProtection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads WAF providers, allows selecting mode, and publishes policy", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/ops/crawler-protection/providers")) {
        return new Response(
          JSON.stringify({
            providers: [
              {
                id: "cloudflare-default",
                type: "cloudflare",
                name: "Cloudflare WAF",
                enabled: true,
                builtIn: true,
                domain: "console.svc.plus",
                planTier: "free",
                credentialSource: "env",
                hasSecret: true,
                capabilities: {
                  supportsObserveMode: false,
                  supportsChallengeMode: true,
                  supportsZoneDiscovery: true,
                  supportsRemoteStatus: true,
                },
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/ops/crawler-protection/publish")) {
        return new Response(
          JSON.stringify({
            ok: true,
            providerId: "cloudflare-default",
            providerType: "cloudflare",
            domain: "console.svc.plus",
            mode: "challenge",
            appliedAction: "managed_challenge",
            ruleId: "rule-1",
            expression: 'http.user_agent contains "ClaudeBot"',
            message: "已下发到 Cloudflare",
            syncedAt: new Date().toISOString(),
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CrawlerProtection />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("console.svc.plus")).toBeTruthy();
    });

    const modeSelect = screen.getByLabelText(/执行模式/);
    fireEvent.change(modeSelect, { target: { value: "challenge" } });

    const publishBtn = screen.getByRole("button", { name: "下发规则到 WAF" });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(screen.getByText(/已下发到 Cloudflare/)).toBeTruthy();
    });
  });
});
