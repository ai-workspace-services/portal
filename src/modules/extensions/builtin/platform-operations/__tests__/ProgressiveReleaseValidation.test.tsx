import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProgressiveReleaseValidation from "../components/ProgressiveReleaseValidation";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProgressiveReleaseValidation Component", () => {
  it("renders the dashboard title, KPI cards, and service matrix", async () => {
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
      flaggerServices: [
        {
          service: "Console",
          serviceDomain: "console.svc.plus",
          phase: "Progressing",
          weight: 20,
          primaryTrafficPct: 80,
          candidateTrafficPct: 20,
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

    // 验证 Flagger 进度卡
    expect(screen.getByText("Flagger (Progressive Release)")).toBeTruthy();
    expect(screen.getByText("Primary 80% | Candidate 20%")).toBeTruthy();

    // 验证 10 项端点详情表
    const billingEndpoints = screen.getAllByText("/api/billing/plans");
    expect(billingEndpoints.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("503").length).toBeGreaterThanOrEqual(1);

    // 验证底部 Callout
    expect(screen.getByText(/Gate rule:/i)).toBeTruthy();
    expect(screen.getByText(/34,862 requests/i)).toBeTruthy();
  });
});
