// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, OPTIONS } from "./route";

describe("Progressive Release API Route", () => {
  it("handles OPTIONS request and returns appropriate CORS headers for observability.svc.plus", async () => {
    const req = new NextRequest("http://localhost:3000/api/operations/progressive-release", {
      method: "OPTIONS",
      headers: { Origin: "https://observability.svc.plus" },
    });
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://observability.svc.plus");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("returns CORS headers on GET request when Origin is present", async () => {
    const req = new NextRequest("http://localhost:3000/api/operations/progressive-release?mock=true&environment=PROD", {
      headers: { Origin: "https://observability.svc.plus" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://observability.svc.plus");
  });
  it("returns sample mock data when mock parameter is set to true", async () => {
    const req = new NextRequest("http://localhost:3000/api/operations/progressive-release?mock=true&environment=PROD");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.environment).toBe("PROD");
    expect(data.gateStatus.status).toBe("BLOCKED");
    expect(data.gateStatus.failedChecks).toBe(1);
    expect(data.flaggerServices).toHaveLength(3);
    expect(data.endpoints).toHaveLength(10);

    // 检查第 7 项（Accounts /api/billing/plans）是否为 503 FAIL
    const failedEndpoint = data.endpoints.find(
      (ep: { endpoint: string }) => ep.endpoint === "/api/billing/plans"
    );
    expect(failedEndpoint).toBeDefined();
    expect(failedEndpoint.observedHttp).toBe(503);
    expect(failedEndpoint.result).toBe("FAIL");

    // 检查 Flagger Traffic 分布 (Console)
    const consoleFlagger = data.flaggerServices.find(
      (f: { service: string }) => f.service === "Console"
    );
    expect(consoleFlagger.weight).toBe(20);
    expect(consoleFlagger.primaryTrafficPct).toBe(80);
    expect(consoleFlagger.candidateTrafficPct).toBe(20);

    // 检查 Billing 是否具备完整渐进发布配置（杜绝 Not configured）
    const billingFlagger = data.flaggerServices.find(
      (f: { service: string }) => f.service === "Billing"
    );
    expect(billingFlagger).toBeDefined();
    expect(billingFlagger.phase).toBe("Succeeded");
    expect(billingFlagger.weight).toBe(0);
    expect(billingFlagger.primaryTrafficPct).toBe(100);
    expect(billingFlagger.candidateTrafficPct).toBe(0);

    // 检查样本统计
    expect(data.candidateSample.requestsCount).toBe(34862);
    expect(data.candidateSample.status).toBe("sufficient");
  });

  it("supports SIT environment parameter with active canary billing", async () => {
    const req = new NextRequest("http://localhost:3000/api/operations/progressive-release?mock=true&environment=SIT");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.environment).toBe("SIT");
    expect(data.cluster).toBe("SIT-K3S-V6");

    const billingFlagger = data.flaggerServices.find(
      (f: { service: string }) => f.service === "Billing"
    );
    expect(billingFlagger).toBeDefined();
    expect(billingFlagger.phase).toBe("Progressing");
    expect(billingFlagger.weight).toBe(10);
    expect(billingFlagger.primaryTrafficPct).toBe(90);
    expect(billingFlagger.candidateTrafficPct).toBe(10);
  });
});
