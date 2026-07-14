// @vitest-environment node

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "../middleware";

describe("middleware public route policy", () => {
  it("keeps homepage public", () => {
    const response = middleware(new NextRequest("https://console.svc.plus/"));

    expect(response).toBeUndefined();
  });

  it("keeps docs routes public", () => {
    const response = middleware(
      new NextRequest("https://console.svc.plus/docs/getting-started"),
    );

    expect(response).toBeUndefined();
  });

  it("keeps only the top-level services page public", () => {
    const publicResponse = middleware(
      new NextRequest("https://console.svc.plus/services"),
    );
    const protectedResponse = middleware(
      new NextRequest("https://console.svc.plus/services/openclaw"),
    );

    expect(publicResponse).toBeUndefined();
    expect(protectedResponse?.status).toBe(307);
    expect(protectedResponse?.headers.get("location")).toContain(
      "/login?redirect=%2Fservices%2Fopenclaw",
    );
  });

  it("keeps prices and about pages public", () => {
    const pricesResponse = middleware(
      new NextRequest("https://console.svc.plus/prices"),
    );
    const aboutResponse = middleware(
      new NextRequest("https://console.svc.plus/about"),
    );

    expect(pricesResponse).toBeUndefined();
    expect(aboutResponse).toBeUndefined();
  });

  it("requires login for products paths", () => {
    const productsResponse = middleware(
      new NextRequest("https://console.svc.plus/products"),
    );
    const productXstreamResponse = middleware(
      new NextRequest("https://console.svc.plus/products/xstream"),
    );

    expect(productsResponse?.status).toBe(307);
    expect(productsResponse?.headers.get("location")).toContain(
      "/login?redirect=%2Fproducts",
    );
    expect(productXstreamResponse?.status).toBe(307);
    expect(productXstreamResponse?.headers.get("location")).toContain(
      "/login?redirect=%2Fproducts%2Fxstream",
    );
  });

  it("redirects protected pages to login when no session cookie exists", () => {
    const response = middleware(
      new NextRequest("https://console.svc.plus/panel?tab=agent"),
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain(
      "/login?redirect=%2Fpanel%3Ftab%3Dagent",
    );
  });

  it("allows protected pages when a session cookie exists", () => {
    const request = new NextRequest("https://console.svc.plus/support");
    request.cookies.set("xc_session", "token");

    const response = middleware(request);

    expect(response).toBeUndefined();
  });
});
