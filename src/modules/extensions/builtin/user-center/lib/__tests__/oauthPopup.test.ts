import { afterEach, describe, expect, it, vi } from "vitest";

import { authorizeConnectorWithPopup } from "../oauthPopup";

describe("authorizeConnectorWithPopup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("opens popup, navigates to Google OAuth URL, and resolves on postMessage return", async () => {
    const popupState = {
      closed: false,
      document: { title: "", body: { innerHTML: "" } },
      location: { href: "about:blank" },
      focus: vi.fn(),
      close: vi.fn(() => {
        popupState.closed = true;
      }),
    };
    const mockPopup = popupState as unknown as Window;

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=s1",
          mode: "popup",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = authorizeConnectorWithPopup({
      connectorId: "google-drive",
      popup: mockPopup,
      body: { returnTo: "/panel/connector" },
    });

    await vi.waitFor(() =>
      expect(mockPopup.location.href).toBe(
        "https://accounts.google.com/o/oauth2/v2/auth?state=s1",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/connectors/google-drive/authorize",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"mode":"popup"'),
      }),
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "connector-oauth-complete",
          connectorId: "google-drive",
          ok: true,
          account: "alice@gmail.com",
        },
      }),
    );

    const result = await promise;
    expect(result).toEqual({ ok: true, account: "alice@gmail.com" });
  });

  it("falls back to full-page redirect when popup is blocked", async () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        origin: "http://localhost:3000",
        assign: assignMock,
      },
      configurable: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=s2",
            mode: "redirect",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await authorizeConnectorWithPopup({
      connectorId: "google-drive",
      popup: null,
    });

    expect(result).toEqual({ ok: true, redirected: true });
    expect(assignMock).toHaveBeenCalledWith(
      "https://accounts.google.com/o/oauth2/v2/auth?state=s2",
    );
  });

  it("resolves cancelled if user closes popup before completion", async () => {
    vi.useFakeTimers();
    const mockPopup = {
      closed: false,
      document: { title: "", body: { innerHTML: "" } },
      location: { href: "about:blank" },
      focus: vi.fn(),
      close: vi.fn(),
    } as unknown as Window;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=s3",
            mode: "popup",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const promise = authorizeConnectorWithPopup({
      connectorId: "google-drive",
      popup: mockPopup,
    });

    await vi.advanceTimersByTimeAsync(10);
    (mockPopup as { closed: boolean }).closed = true;
    await vi.advanceTimersByTimeAsync(700);

    const result = await promise;
    expect(result).toEqual({
      ok: false,
      cancelled: true,
      error: "已关闭授权窗口，未完成连接。",
    });
  });
});
