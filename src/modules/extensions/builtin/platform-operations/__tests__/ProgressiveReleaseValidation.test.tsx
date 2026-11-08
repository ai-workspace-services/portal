import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProgressiveReleaseValidation from "../components/ProgressiveReleaseValidation";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProgressiveReleaseValidation Component", () => {
  it("renders the dashboard title, KPI cards, service matrix, and complete Billing canary status", async () => {
    // Mock fetch for the API
    const mockPayload = {
      environment: "PROD",
      cluster: "PROD-K3S-V6",
      observationWindow: {
        label: "Last 15 minutes",
        formattedTimeRange: "Last 15 minutes (14:45 – 15:00 UTC)",
      },
      gateStatus: {
        status: "BLOCKED",
        failedChecks: 1,
        totalChecks: 10,
        summary: "1 / 10 checks failed",
      },
      serviceMatrix: {
        services: [
          { name: "Console", domain: "console.svc.plus", color: "#283457", endpoints: ["/healthz", "/login", "/panel/agent"] },
          { name: "Accounts", domain: "accounts.svc.plus", color: "#302d54", endpoints: ["/healthz", "/readyz", "/api/ping", "/api/billing/plans"] },
          { name: "Billing", domain: "billing.svc.plus", color: "#4a3c22", endpoints: ["/healthz", "/readyz", "/api/ping"] },
        ],
        rows: [
          {
            service: "Console",
            domain: "console.svc.plus",
            cells: {
              "Console:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 38 },
            },
          },
          {
            service: "Accounts",
            domain: "accounts.svc.plus",
            cells: {
              "Accounts:/api/billing/plans": { isRelevant: true, result: "FAIL", httpCode: 503, p95LatencyMs: 1204 },
            },
          },
          {
            service: "Billing",
            domain: "billing.svc.plus",
            cells: {
              "Billing:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 35 },
            },
          },
        ],
      },
      flaggerServices: [
        {
          service: "Console",
          serviceDomain: "console.svc.plus",
          phase: "Progressing",
          weight: 20,
          primaryTrafficPct: 80,
          candidateTrafficPct: 20,
        },
        {
          service: "Accounts",
          serviceDomain: "accounts.svc.plus",
          phase: "Progressing",
          weight: 10,
          primaryTrafficPct: 90,
          candidateTrafficPct: 10,
        },
        {
          service: "Billing",
          serviceDomain: "billing.svc.plus",
          phase: "Succeeded",
          weight: 0,
          primaryTrafficPct: 100,
          candidateTrafficPct: 0,
        },
      ],
      endpoints: [
        {
          id: "console-healthz",
          order: 1,
          service: "Console",
          endpoint: "/healthz",
          expectedHttp: 200,
          observedHttp: 200,
          p95LatencyMs: 43,
          freshnessSec: 9,
          result: "PASS",
        },
        {
          id: "accounts-billing-plans",
          order: 7,
          service: "Accounts",
          endpoint: "/api/billing/plans",
          expectedHttp: 200,
          observedHttp: 503,
          p95LatencyMs: 1207,
          freshnessSec: 10,
          result: "FAIL",
        },
        {
          id: "billing-healthz",
          order: 8,
          service: "Billing",
          endpoint: "/healthz",
          expectedHttp: 200,
          observedHttp: 200,
          p95LatencyMs: 63,
          freshnessSec: 9,
          result: "PASS",
        },
      ],
      allRoutesAndApis: [
        {
          id: "fe-operations",
          order: 1,
          type: "frontend",
          service: "Console",
          serviceDomain: "console.svc.plus",
          path: "/panel/operations",
          description: "平台运维中心与渐进发布门禁验证看板",
          method: "GET",
          expectedHttp: 200,
          observedHttp: 200,
          latencyMs: 38,
          freshnessSec: 8,
          result: "PASS",
        },
        {
          id: "fe-agent",
          order: 2,
          type: "frontend",
          service: "Console",
          serviceDomain: "console.svc.plus",
          path: "/panel/agent",
          description: "智能体应用编排、会话拓扑与纳管配置",
          method: "GET",
          expectedHttp: 307,
          observedHttp: 307,
          latencyMs: 14,
          freshnessSec: 8,
          result: "PASS",
        },
        {
          id: "api-accounts-billing-plans",
          order: 13,
          type: "api",
          service: "Accounts",
          serviceDomain: "accounts.svc.plus",
          path: "/api/billing/plans",
          description: "Accounts 计费套餐与权益同步网关接口",
          method: "GET",
          expectedHttp: 200,
          observedHttp: 200,
          latencyMs: 67,
          freshnessSec: 8,
          result: "PASS",
        },
      ],
      candidateSample: {
        requestsCount: 34862,
        summary: "(sufficient, ≥ 10,000)",
      },
      source: "mock",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPayload,
      })
    );

    render(<ProgressiveReleaseValidation initialEnvironment="PROD" />);

    // 验证核心大标题与副标题
    expect(screen.getByText("Progressive Release Validation")).toBeTruthy();
    expect(
      screen.getByText(/Service × API status matrix for progressive releases/i)
    ).toBeTruthy();

    // 验证三张 KPI 卡片
    expect(screen.getByText("Environment")).toBeTruthy();
    expect(screen.getByText("Observation window")).toBeTruthy();
    expect(screen.getByText("Release gate (overall)")).toBeTruthy();
    const blockedElements = await screen.findAllByText("BLOCKED");
    expect(blockedElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 / 10 checks failed")).toBeTruthy();

    // 验证 Service 矩阵表头
    expect(screen.getByText("Service × Endpoint Status")).toBeTruthy();

    // 验证 Flagger 进度卡包含所有 3 项服务（包括 Billing 的 Succeeded 状态与双色流量比例）
    expect(screen.getByText("Flagger (Progressive Release)")).toBeTruthy();
    expect(screen.getByText("Primary 80% | Candidate 20%")).toBeTruthy();
    expect(screen.getByText("Primary 100% | Candidate 0%")).toBeTruthy();
    expect(screen.getByText("Succeeded")).toBeTruthy();
    // 确保不再存在 "Not configured"
    expect(screen.queryByText("Not configured")).toBeNull();
    expect(screen.queryByText("No canary configured for this service")).toBeNull();

    // 验证 10 项端点详情表
    const billingEndpoints = screen.getAllByText("/api/billing/plans");
    expect(billingEndpoints.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("503").length).toBeGreaterThanOrEqual(1);

    // 验证底部 Callout
    expect(screen.getByText(/Gate rule:/i)).toBeTruthy();
    expect(screen.getByText(/34,862 requests/i)).toBeTruthy();

    // 验证底部可折叠表格：全量前端路由与后端 API 清单
    expect(
      screen.getByText(/Web Console 前端全量路由与后端服务 API 接口清单/i)
    ).toBeTruthy();
    expect(screen.getByText(/Full Routing & Microservice APIs Matrix/i)).toBeTruthy();
    expect(screen.getByText(/Frontend \(/i)).toBeTruthy();
    expect(screen.getByText(/Backend APIs \(/i)).toBeTruthy();
  });
});
