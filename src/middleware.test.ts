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

  it("keeps services and sub-services pages public", () => {
    const servicesResponse = middleware(
      new NextRequest("https://console.svc.plus/services"),
    );
    const subServicesResponse = middleware(
      new NextRequest("https://console.svc.plus/services/openclaw"),
    );

    expect(servicesResponse).toBeUndefined();
    expect(subServicesResponse).toBeUndefined();
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

  it("keeps products paths public", () => {
    const productsResponse = middleware(
      new NextRequest("https://console.svc.plus/products"),
    );
    const productXstreamResponse = middleware(
      new NextRequest("https://console.svc.plus/products/xstream"),
    );

    expect(productsResponse).toBeUndefined();
    expect(productXstreamResponse).toBeUndefined();
  });

  it("keeps blogs public", () => {
    const blogsResponse = middleware(
      new NextRequest("https://console.svc.plus/blogs"),
    );

    expect(blogsResponse).toBeUndefined();
  });

  it("redirects panel (User/Admin Console) pages to login when no session cookie exists", () => {
    const response = middleware(
      new NextRequest("https://console.svc.plus/panel?tab=agent"),
    );
    const managementResponse = middleware(
      new NextRequest("https://console.svc.plus/panel/management"),
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain(
      "/login?redirect=%2Fpanel%3Ftab%3Dagent",
    );

    expect(managementResponse?.status).toBe(307);
    expect(managementResponse?.headers.get("location")).toContain(
      "/login?redirect=%2Fpanel%2Fmanagement",
    );
  });

  it("allows panel pages when a session cookie exists", () => {
    const request = new NextRequest("https://console.svc.plus/panel");
    request.cookies.set("xc_session", "token");

    const response = middleware(request);

    expect(response).toBeUndefined();
  });
});
