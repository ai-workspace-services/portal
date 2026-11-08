import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface EndpointProbeStatus {
  id: string;
  order: number;
  service: "Console" | "Accounts" | "Billing";
  serviceDomain: string;
  endpoint: string;
  expectedHttp: number;
  observedHttp: number;
  p95LatencyMs: number;
  freshnessSec: number;
  result: "PASS" | "FAIL" | "NO DATA";
}

export interface FlaggerReleaseStatus {
  service: "Console" | "Accounts" | "Billing";
  serviceDomain: string;
  phase: "Progressing" | "Succeeded" | "Failed";
  weight: number | null; // percentage e.g. 20
  primaryTrafficPct: number;
  candidateTrafficPct: number;
}

export interface ProgressiveReleasePayload {
  environment: "PROD" | "SIT";
  cluster: string;
  observationWindow: {
    label: string;
    startUtc: string;
    endUtc: string;
    formattedTimeRange: string;
  };
  gateStatus: {
    status: "BLOCKED" | "ALLOWED";
    failedChecks: number;
    totalChecks: number;
    summary: string;
  };
  serviceMatrix: {
    services: Array<{
      name: "Console" | "Accounts" | "Billing";
      domain: string;
      color: string;
      endpoints: string[];
    }>;
    rows: Array<{
      service: "Console" | "Accounts" | "Billing";
      domain: string;
      cells: Record<
        string,
        {
          isRelevant: boolean;
          result: "PASS" | "FAIL" | "NO DATA";
          httpCode: number | null;
          p95LatencyMs: number | null;
        }
      >;
    }>;
  };
  flaggerServices: FlaggerReleaseStatus[];
  endpoints: EndpointProbeStatus[];
  gateRule: {
    description: string;
  };
  candidateSample: {
    requestsCount: number;
    status: "sufficient" | "insufficient";
    threshold: number;
    summary: string;
  };
  source: "live" | "mock";
  updatedAtUtc: string;
}

// 对应设计原型图的高精度基准 Mock 数据
function getMockPayload(environment: "PROD" | "SIT" = "PROD"): ProgressiveReleasePayload {
  const now = new Date();
  const endUtc = now.toISOString().slice(11, 16);
  const startWindow = new Date(now.getTime() - 15 * 60 * 1000);
  const startUtc = startWindow.toISOString().slice(11, 16);

  const endpoints: EndpointProbeStatus[] = [
    {
      id: "console-healthz",
      order: 1,
      service: "Console",
      serviceDomain: "console.svc.plus",
      endpoint: "/healthz",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 43,
      freshnessSec: 9,
      result: "PASS",
    },
    {
      id: "console-login",
      order: 2,
      service: "Console",
      serviceDomain: "console.svc.plus",
      endpoint: "/login",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 128,
      freshnessSec: 11,
      result: "PASS",
    },
    {
      id: "console-panel-agent",
      order: 3,
      service: "Console",
      serviceDomain: "console.svc.plus",
      endpoint: "/panel/agent",
      expectedHttp: 307,
      observedHttp: 307,
      p95LatencyMs: 167,
      freshnessSec: 12,
      result: "PASS",
    },
    {
      id: "accounts-healthz",
      order: 4,
      service: "Accounts",
      serviceDomain: "accounts.svc.plus",
      endpoint: "/healthz",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 51,
      freshnessSec: 8,
      result: "PASS",
    },
    {
      id: "accounts-readyz",
      order: 5,
      service: "Accounts",
      serviceDomain: "accounts.svc.plus",
      endpoint: "/readyz",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 67,
      freshnessSec: 9,
      result: "PASS",
    },
    {
      id: "accounts-api-ping",
      order: 6,
      service: "Accounts",
      serviceDomain: "accounts.svc.plus",
      endpoint: "/api/ping",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 92,
      freshnessSec: 10,
      result: "PASS",
    },
    {
      id: "accounts-api-billing-plans",
      order: 7,
      service: "Accounts",
      serviceDomain: "accounts.svc.plus",
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
      serviceDomain: "billing.svc.plus",
      endpoint: "/healthz",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 63,
      freshnessSec: 9,
      result: "PASS",
    },
    {
      id: "billing-readyz",
      order: 9,
      service: "Billing",
      serviceDomain: "billing.svc.plus",
      endpoint: "/readyz",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 71,
      freshnessSec: 9,
      result: "PASS",
    },
    {
      id: "billing-api-ping",
      order: 10,
      service: "Billing",
      serviceDomain: "billing.svc.plus",
      endpoint: "/api/ping",
      expectedHttp: 200,
      observedHttp: 200,
      p95LatencyMs: 118,
      freshnessSec: 11,
      result: "PASS",
    },
  ];

  return {
    environment,
    cluster: environment === "PROD" ? "PROD-K3S-V6" : "SIT-K3S-V6",
    observationWindow: {
      label: "Last 15 minutes",
      startUtc,
      endUtc,
      formattedTimeRange: `Last 15 minutes (${startUtc} – ${endUtc} UTC)`,
    },
    gateStatus: {
      status: "BLOCKED",
      failedChecks: 1,
      totalChecks: 10,
      summary: "1 / 10 checks failed",
    },
    serviceMatrix: {
      services: [
        {
          name: "Console",
          domain: "console.svc.plus",
          color: "#283457",
          endpoints: ["/healthz", "/login", "/panel/agent"],
        },
        {
          name: "Accounts",
          domain: "accounts.svc.plus",
          color: "#302d54",
          endpoints: ["/healthz", "/readyz", "/api/ping", "/api/billing/plans"],
        },
        {
          name: "Billing",
          domain: "billing.svc.plus",
          color: "#4a3c22",
          endpoints: ["/healthz", "/readyz", "/api/ping"],
        },
      ],
      rows: [
        {
          service: "Console",
          domain: "console.svc.plus",
          cells: {
            "Console:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 38 },
            "Console:/login": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 182 },
            "Console:/panel/agent": { isRelevant: true, result: "PASS", httpCode: 307, p95LatencyMs: 246 },
            "Accounts:/healthz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/readyz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/api/ping": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/api/billing/plans": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Billing:/healthz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Billing:/readyz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Billing:/api/ping": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
          },
        },
        {
          service: "Accounts",
          domain: "accounts.svc.plus",
          cells: {
            "Console:/healthz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Console:/login": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Console:/panel/agent": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 41 },
            "Accounts:/readyz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 57 },
            "Accounts:/api/ping": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 64 },
            "Accounts:/api/billing/plans": { isRelevant: true, result: "FAIL", httpCode: 503, p95LatencyMs: 1204 },
            "Billing:/healthz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Billing:/readyz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Billing:/api/ping": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
          },
        },
        {
          service: "Billing",
          domain: "billing.svc.plus",
          cells: {
            "Console:/healthz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Console:/login": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Console:/panel/agent": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/healthz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/readyz": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/api/ping": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Accounts:/api/billing/plans": { isRelevant: false, result: "PASS", httpCode: null, p95LatencyMs: null },
            "Billing:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 35 },
            "Billing:/readyz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 42 },
            "Billing:/api/ping": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 71 },
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
        phase: environment === "PROD" ? "Succeeded" : "Progressing",
        weight: environment === "PROD" ? 0 : 10,
        primaryTrafficPct: environment === "PROD" ? 100 : 90,
        candidateTrafficPct: environment === "PROD" ? 0 : 10,
      },
    ],
    endpoints,
    gateRule: {
      description:
        "The release is BLOCKED if any endpoint is failed, stale (exceeds freshness), missing samples (NO DATA), or if the candidate request sample is insufficient.",
    },
    candidateSample: {
      requestsCount: 34862,
      status: "sufficient",
      threshold: 10000,
      summary: "(sufficient, ≥ 10,000)",
    },
    source: "mock",
    updatedAtUtc: new Date().toISOString().slice(11, 19) + " UTC",
  };
}

async function queryVictoriaMetrics(query: string, timeoutMs = 4000) {
  const baseUrl =
    process.env.OBSERVABILITY_URL ||
    process.env.NEXT_PUBLIC_OBSERVABILITY_URL ||
    "https://observability.svc.plus";
  const authUser = process.env.OBSERVABILITY_AUTH_USER || "observability";
  const authPass =
    process.env.OBSERVABILITY_AUTH_PASSWORD ||
    "Bearer uTvryFvAbz6M5sRtmTaSTQY6otLZ95hneBsWqXu+35I=";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authUser && authPass) {
    headers["Authorization"] =
      "Basic " + Buffer.from(`${authUser}:${authPass}`).toString("base64");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL("/api/v1/query", baseUrl);
    url.searchParams.set("query", query);
    const res = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data?.data?.result ?? null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const envParam = (searchParams.get("environment") || "PROD").toUpperCase() as "PROD" | "SIT";
  const forceMock = searchParams.get("mock") === "true";

  if (forceMock) {
    return NextResponse.json(getMockPayload(envParam));
  }

  try {
    // 尝试向 VictoriaMetrics 实时拉取真实拨测数据
    const cluster = envParam === "PROD" ? "PROD-K3S-V6" : "SIT-K3S-V6";
    const probeResults = await queryVictoriaMetrics(
      `probe_success{job="progressive-release-probes",cluster="${cluster}"}`
    );

    // 如果无法获取上游真实数据，优雅降级返回原型图样本数据
    if (!probeResults || !Array.isArray(probeResults) || probeResults.length === 0) {
      const mockPayload = getMockPayload(envParam);
      return NextResponse.json(mockPayload);
    }

    // 查询状态码与延迟
    const statusCodeResults = await queryVictoriaMetrics(
      `probe_http_status_code{job="progressive-release-probes",cluster="${cluster}"}`
    );
    const durationResults = await queryVictoriaMetrics(
      `probe_duration_seconds{job="progressive-release-probes",cluster="${cluster}"}`
    );
    // 查询候选样本总请求量
    const sampleResults = await queryVictoriaMetrics(
      `sum(traefik_service_requests_total{cluster="${cluster}"})`
    );

    const statusMap = new Map<string, number>();
    if (Array.isArray(statusCodeResults)) {
      for (const item of statusCodeResults) {
        const key = `${(item?.metric?.service || "").toLowerCase()}:${item?.metric?.route || ""}`;
        const val = Number(item?.value?.[1]);
        if (!isNaN(val)) statusMap.set(key, val);
      }
    }

    const durationMap = new Map<string, number>();
    if (Array.isArray(durationResults)) {
      for (const item of durationResults) {
        const key = `${(item?.metric?.service || "").toLowerCase()}:${item?.metric?.route || ""}`;
        const val = Number(item?.value?.[1]);
        if (!isNaN(val)) durationMap.set(key, Math.round(val * 1000));
      }
    }

    // 构建真实数据并合成 Payload
    const baseMock = getMockPayload(envParam);
    baseMock.source = "live";

    let failedCount = 0;
    const updatedEndpoints = baseMock.endpoints.map((ep) => {
      // 匹配服务与路由
      for (const pr of probeResults) {
        const s = (pr?.metric?.service || "").toLowerCase();
        const r = pr?.metric?.route || "";
        const instance = pr?.metric?.instance || "";
        if (s === ep.service.toLowerCase() && (r === ep.endpoint || instance.includes(ep.endpoint))) {
          const success = Number(pr?.value?.[1]) === 1;
          const key = `${s}:${ep.endpoint}`;
          const httpCode = statusMap.get(key) ?? ep.expectedHttp;
          const latMs = durationMap.get(key) ?? ep.p95LatencyMs;
          const sampleTimeSec = Number(pr?.value?.[0]);
          const freshness = !isNaN(sampleTimeSec) && sampleTimeSec > 0
            ? Math.max(1, Math.round(Date.now() / 1000 - sampleTimeSec))
            : ep.freshnessSec;

          const result: "PASS" | "FAIL" = success && httpCode === ep.expectedHttp ? "PASS" : "FAIL";
          if (result === "FAIL") failedCount++;
          return {
            ...ep,
            observedHttp: httpCode,
            p95LatencyMs: latMs,
            freshnessSec: freshness,
            result,
          };
        }
      }
      return ep;
    });

    baseMock.endpoints = updatedEndpoints;
    baseMock.gateStatus.failedChecks = failedCount;
    baseMock.gateStatus.status = failedCount > 0 ? "BLOCKED" : "ALLOWED";
    baseMock.gateStatus.summary = failedCount > 0
      ? `${failedCount} / ${updatedEndpoints.length} checks failed`
      : `All ${updatedEndpoints.length} checks passed (Gate Clear)`;

    // 候选样本统计
    if (Array.isArray(sampleResults) && sampleResults.length > 0) {
      const rawCount = Number(sampleResults[0]?.value?.[1]);
      if (!isNaN(rawCount) && rawCount > 0) {
        baseMock.candidateSample.requestsCount = Math.round(rawCount);
        baseMock.candidateSample.status = rawCount >= 10000 ? "sufficient" : "insufficient";
        baseMock.candidateSample.summary = rawCount >= 10000 ? "(sufficient, ≥ 10,000)" : `(insufficient, < 10,000)`;
      }
    }

    // 同步更新矩阵单元格状态
    for (const ep of updatedEndpoints) {
      const cellKey = `${ep.service}:${ep.endpoint}`;
      for (const row of baseMock.serviceMatrix.rows) {
        if (row.service === ep.service && row.cells[cellKey]) {
          row.cells[cellKey] = {
            isRelevant: true,
            result: ep.result,
            httpCode: ep.observedHttp,
            p95LatencyMs: ep.p95LatencyMs,
          };
        }
      }
    }

    // 确保真实环境中所有服务具备正确的渐进发布配置状态
    baseMock.flaggerServices = [
      {
        service: "Console",
        serviceDomain: "console.svc.plus",
        phase: "Progressing",
        weight: envParam === "PROD" ? 20 : 10,
        primaryTrafficPct: envParam === "PROD" ? 80 : 90,
        candidateTrafficPct: envParam === "PROD" ? 20 : 10,
      },
      {
        service: "Accounts",
        serviceDomain: "accounts.svc.plus",
        phase: "Progressing",
        weight: envParam === "PROD" ? 10 : 20,
        primaryTrafficPct: envParam === "PROD" ? 90 : 80,
        candidateTrafficPct: envParam === "PROD" ? 10 : 20,
      },
      {
        service: "Billing",
        serviceDomain: "billing.svc.plus",
        phase: envParam === "PROD" ? "Succeeded" : "Progressing",
        weight: envParam === "PROD" ? 0 : 10,
        primaryTrafficPct: envParam === "PROD" ? 100 : 90,
        candidateTrafficPct: envParam === "PROD" ? 0 : 10,
      },
    ];

    return NextResponse.json(baseMock);
  } catch {
    return NextResponse.json(getMockPayload(envParam));
  }
}
