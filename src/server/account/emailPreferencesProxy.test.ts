import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxyEmailPreferences } from "./emailPreferencesProxy";

const mocks = vi.hoisted(() => ({ session: vi.fn(), fetch: vi.fn() }));
vi.mock("@server/account/session", () => ({
  getAccountSession: mocks.session,
}));
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "https://accounts.example/api/auth",
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.session.mockResolvedValue({ user: null });
});
describe("email preference BFF", () => {
  it("allows a capability link without reading an account session", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ offers: false }));
    const response = await proxyEmailPreferences(
      new NextRequest(
        "https://console.example/api/auth/email-preferences?key=opaque",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://accounts.example/api/auth/email-preferences?key=opaque",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
  it("requires a session when no capability is provided", async () => {
    const response = await proxyEmailPreferences(
      new NextRequest("https://console.example/api/auth/email-preferences"),
    );
    expect(response.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("preserves the no-content one-click unsubscribe response", async () => {
    mocks.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    const response = await proxyEmailPreferences(
      new NextRequest(
        "https://console.example/api/auth/email-unsubscribe?key=opaque",
        {
          method: "POST",
          body: "List-Unsubscribe=One-Click",
          headers: { "content-type": "application/x-www-form-urlencoded" },
        },
      ),
      true,
    );
    expect(response.status).toBe(204);
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://accounts.example/api/auth/email-unsubscribe?key=opaque",
      expect.objectContaining({
        method: "POST",
        body: "List-Unsubscribe=One-Click",
      }),
    );
  });
  it("does not treat a non-JSON 200 response as a successful save", async () => {
    mocks.fetch.mockResolvedValue(new Response("not JSON", { status: 200 }));
    const response = await proxyEmailPreferences(
      new NextRequest(
        "https://console.example/api/auth/email-preferences?key=opaque",
      ),
    );
    expect(response.status).toBe(502);
  });
  it("returns a bounded failure when Accounts is unavailable", async () => {
    mocks.fetch.mockRejectedValue(new Error("connection unavailable"));
    const response = await proxyEmailPreferences(
      new NextRequest(
        "https://console.example/api/auth/email-preferences?key=opaque",
      ),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "account_service_unavailable",
    });
  });
});
