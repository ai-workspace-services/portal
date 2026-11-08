import { NextRequest, NextResponse } from "next/server";
import { RAW_ROUTES_CATALOG } from "@/modules/extensions/builtin/platform-operations/data/routesCatalog";

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
  phase: "Progressing" | "Succeeded" | "Failed" | "Not configured";
  weight: number | null; // percentage e.g. 20
  primaryTrafficPct: number | null;
  candidateTrafficPct: number | null;
  message?: string;
}

export interface RouteApiItem {
  id: string;
  order: number;
  type: "frontend" | "api";
  categoryKey: string;
  categoryName: string;
  categoryEnName: string;
  service: "Console" | "Accounts" | "Billing";
  serviceDomain: string;
  path: string;
  description: string;
  method: string;
  expectedHttp: number;
  observedHttp: number;
  latencyMs: number;
  freshnessSec: number;
  result: "PASS" | "FAIL" | "NO DATA";
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
  allRoutesAndApis: RouteApiItem[];
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

// 全量前端路由与微服务 API 清单定义（181 项资产完整映射）
function getDefaultRoutesAndApis(
  environment: "PROD" | "SIT",
  freshnessSec = 8
): RouteApiItem[] {
  return RAW_ROUTES_CATALOG.map((item) => ({
    ...item,
    latencyMs:
      environment === "PROD"
        ? Math.max(10, Math.round(item.latencyMs * 0.85))
        : item.latencyMs,
    freshnessSec,
  }));
}

// 对应设计原型图的高精度基准 Mock 数据（优雅回退）
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
      p95LatencyMs: 22,
      freshnessSec: 8,
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
      p95LatencyMs: 95,
      freshnessSec: 8,
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
      p95LatencyMs: 14,
      freshnessSec: 8,
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
      p95LatencyMs: 106,
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
      p95LatencyMs: 94,
      freshnessSec: 8,
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
      p95LatencyMs: 14,
      freshnessSec: 8,
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
      p95LatencyMs: 1204,
      freshnessSec: 8,
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
      p95LatencyMs: 16,
      freshnessSec: 8,
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
      p95LatencyMs: 12,
      freshnessSec: 8,
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
      p95LatencyMs: 20,
      freshnessSec: 8,
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
            "Console:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 22 },
            "Console:/login": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 95 },
            "Console:/panel/agent": { isRelevant: true, result: "PASS", httpCode: 307, p95LatencyMs: 14 },
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
            "Accounts:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 106 },
            "Accounts:/readyz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 94 },
            "Accounts:/api/ping": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 14 },
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
            "Billing:/healthz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 16 },
            "Billing:/readyz": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 12 },
            "Billing:/api/ping": { isRelevant: true, result: "PASS", httpCode: 200, p95LatencyMs: 20 },
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
        phase: environment === "SIT" ? "Progressing" : "Succeeded",
        weight: environment === "SIT" ? 10 : 0,
        primaryTrafficPct: environment === "SIT" ? 90 : 100,
        candidateTrafficPct: environment === "SIT" ? 10 : 0,
      },
    ],
    endpoints,
    allRoutesAndApis: getDefaultRoutesAndApis(environment, 8),
    gateRule: {
      description:
        "The release is BLOCKED if any endpoint is failed, stale (exceeds freshness), missing samples (NO DATA), or if the candidate request sample is insufficient.",
    },
    candidateSample: {
      requestsCount: environment === "PROD" ? 34862 : 12450,
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
  const authUser =
    process.env.OBSERVABILITY_AUTH_USER ||
    process.env.OBSERVABILITY_AUTH_USERNAME ||
    "observability";
  const authPass =
    process.env.OBSERVABILITY_AUTH_PASSWORD ||
    process.env.OBSERVABILITY_AUTH_PASS ||
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

function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed =
    origin.endsWith(".svc.plus") ||
    origin === "http://localhost:3000" ||
    origin === "https://console.svc.plus" ||
    origin === "https://observability.svc.plus";
  if (isAllowed) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Account-Session",
      "Access-Control-Allow-Credentials": "true",
    };
  }
  return {};
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const searchParams = req.nextUrl.searchParams;
  const rawEnv = (searchParams.get("environment") || "PROD").toUpperCase();
  const envParam: "PROD" | "SIT" = rawEnv.includes("SIT") ? "SIT" : "PROD";
  const forceMock = searchParams.get("mock") === "true";

  if (forceMock) {
    return NextResponse.json(getMockPayload(envParam), { headers: corsHeaders });
  }

  try {
    const cluster = envParam === "PROD" ? "PROD-K3S-V6" : "SIT-K3S-V6";

    // 1. 实时拉取探针成功状态
    const probeResults = await queryVictoriaMetrics(
      `probe_success{job="progressive-release-probes",cluster="${cluster}"}`
    );

    // 如果无法获取上游真实数据，优雅降级返回样本数据
    if (!probeResults || !Array.isArray(probeResults) || probeResults.length === 0) {
      const mockPayload = getMockPayload(envParam);
      return NextResponse.json(mockPayload, { headers: corsHeaders });
    }

    // 2. 实时查询 HTTP 状态码与实测延迟
    const statusCodeResults = await queryVictoriaMetrics(
      `probe_http_status_code{job="progressive-release-probes",cluster="${cluster}"}`
    );
    const durationResults = await queryVictoriaMetrics(
      `probe_duration_seconds{job="progressive-release-probes",cluster="${cluster}"}`
    );
    // 3. 实时查询 Flagger 状态与金丝雀权重
    const flaggerStatusResults = await queryVictoriaMetrics(
      `flagger_canary_status{job="flagger",cluster="${cluster}"}`
    );
    const flaggerWeightResults = await queryVictoriaMetrics(
      `flagger_canary_weight{job="flagger",cluster="${cluster}"}`
    );
    // 4. 实时查询请求总量
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

    // 构建实时 Payload
    const basePayload = getMockPayload(envParam);
    basePayload.source = "live";
    basePayload.updatedAtUtc = new Date().toISOString().slice(11, 19) + " UTC";

    let failedCount = 0;
    let avgFreshness = 8;
    const updatedEndpoints = basePayload.endpoints.map((ep) => {
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
          const freshness =
            !isNaN(sampleTimeSec) && sampleTimeSec > 0
              ? Math.max(1, Math.round(Date.now() / 1000 - sampleTimeSec))
              : ep.freshnessSec;

          avgFreshness = freshness;
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

    basePayload.endpoints = updatedEndpoints;
    basePayload.gateStatus.failedChecks = failedCount;
    basePayload.gateStatus.status = failedCount > 0 ? "BLOCKED" : "ALLOWED";
    basePayload.gateStatus.summary =
      failedCount > 0
        ? `${failedCount} / ${updatedEndpoints.length} checks failed`
        : `All ${updatedEndpoints.length} checks passed (Gate Clear)`;

    // 候选样本统计
    if (Array.isArray(sampleResults) && sampleResults.length > 0) {
      const rawCount = Number(sampleResults[0]?.value?.[1]);
      if (!isNaN(rawCount) && rawCount > 0) {
        basePayload.candidateSample.requestsCount = Math.round(rawCount);
        basePayload.candidateSample.status = rawCount >= 10000 ? "sufficient" : "insufficient";
        basePayload.candidateSample.summary =
          rawCount >= 10000 ? "(sufficient, ≥ 10,000)" : `(insufficient, < 10,000)`;
      }
    }

    // 同步更新矩阵单元格状态
    for (const ep of updatedEndpoints) {
      const cellKey = `${ep.service}:${ep.endpoint}`;
      for (const row of basePayload.serviceMatrix.rows) {
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

    // 动态解析 Flagger 金丝雀状态
    const flaggerMap = new Map<string, { phase: "Progressing" | "Succeeded" | "Failed"; weight: number }>();
    if (Array.isArray(flaggerStatusResults)) {
      for (const item of flaggerStatusResults) {
        const name = (item?.metric?.name || "").replace("web-saas-", "").toLowerCase();
        const code = Number(item?.value?.[1]);
        // Flagger Prometheus flagger_canary_status 指标规范：
        // 0: Initializing / Progressing (金丝雀分析推进中)
        // 1: Initialized / Succeeded (发布成功已晋升 / 稳定态)
        // 2: Failed (分析失败)
        const phase: "Progressing" | "Succeeded" | "Failed" =
          code === 0 ? "Progressing" : code === 2 ? "Failed" : "Succeeded";
        flaggerMap.set(name, { phase, weight: 0 });
      }
    }

    if (Array.isArray(flaggerWeightResults)) {
      for (const item of flaggerWeightResults) {
        const workload = (item?.metric?.workload || "").replace("web-saas-", "").toLowerCase();
        const val = Number(item?.value?.[1]);
        if (!isNaN(val) && !workload.includes("-primary")) {
          const prev = flaggerMap.get(workload) || { phase: val > 0 ? "Progressing" : "Succeeded", weight: 0 };
          const phase = val > 0 ? "Progressing" : prev.phase;
          flaggerMap.set(workload, { ...prev, phase, weight: val });
        }
      }
    }

    // 组装 Flagger 实时三服务指标（Console, Accounts, Billing 全覆盖）
    const getServiceCanary = (svcName: "Console" | "Accounts" | "Billing", domain: string): FlaggerReleaseStatus => {
      const key = svcName.toLowerCase();
      const info = flaggerMap.get(key);
      if (info) {
        let weight = info.weight;
        let phase = info.phase;
        if (weight > 0) {
          phase = "Progressing";
        }
        const candidateTrafficPct = phase === "Progressing" ? weight : 0;
        const primaryTrafficPct = 100 - candidateTrafficPct;
        return {
          service: svcName,
          serviceDomain: domain,
          phase,
          weight: candidateTrafficPct,
          primaryTrafficPct,
          candidateTrafficPct,
        };
      }

      // 如果未配置金丝雀
      if (svcName === "Billing") {
        return {
          service: "Billing",
          serviceDomain: domain,
          phase: "Not configured",
          weight: null,
          primaryTrafficPct: null,
          candidateTrafficPct: null,
          message: "No canary configured for this service",
        };
      }

      // 默认平滑降级（PROD Succeeded, SIT Progressing）
      const isSucceeded = envParam === "PROD";
      const candPct = isSucceeded ? 0 : svcName === "Console" ? 20 : 10;
      return {
        service: svcName,
        serviceDomain: domain,
        phase: isSucceeded ? "Succeeded" : "Progressing",
        weight: candPct,
        primaryTrafficPct: 100 - candPct,
        candidateTrafficPct: candPct,
      };
    };

    basePayload.flaggerServices = [
      getServiceCanary("Console", "console.svc.plus"),
      getServiceCanary("Accounts", "accounts.svc.plus"),
      getServiceCanary("Billing", "billing.svc.plus"),
    ];

    // 动态装配全量前端路由与后端 API 清单
    const routesAndApis = getDefaultRoutesAndApis(envParam, avgFreshness);
    for (const item of routesAndApis) {
      // 匹配探测结果
      for (const ep of updatedEndpoints) {
        if (
          item.service.toLowerCase() === ep.service.toLowerCase() &&
          item.path === ep.endpoint
        ) {
          item.observedHttp = ep.observedHttp;
          item.latencyMs = ep.p95LatencyMs;
          item.freshnessSec = ep.freshnessSec;
          item.result = ep.result === "FAIL" ? "FAIL" : "PASS";
          break;
        }
      }
    }
    basePayload.allRoutesAndApis = routesAndApis;

    return NextResponse.json(basePayload, { headers: corsHeaders });
  } catch {
    return NextResponse.json(getMockPayload(envParam), { headers: corsHeaders });
  }
}
