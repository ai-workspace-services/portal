import { describe, expect, it } from "vitest";
import { resolveDDTraceConfig, resolveTracingProvider } from "@/server/observability";

describe("observability tracing provider selection", () => {
  it("prefers OTel when both OTLP endpoint and DD_AGENT_HOST are configured", () => {
    expect(
      resolveTracingProvider({
        NODE_ENV: "production",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://otel:4317",
        DD_AGENT_HOST: "datakit-service.observability-sit.svc",
      }),
    ).toBe("otel");
  });

  it("selects ddtrace when OTel is not active and DD_AGENT_HOST is set", () => {
    expect(
      resolveTracingProvider({
        NODE_ENV: "production",
        DD_AGENT_HOST: "datakit-service.observability-sit.svc",
      }),
    ).toBe("ddtrace");

    expect(
      resolveTracingProvider({
        NODE_ENV: "production",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://otel:4317",
        OTEL_SDK_DISABLED: "true",
        DD_AGENT_HOST: "datakit-service.observability-sit.svc",
      }),
    ).toBe("ddtrace");
  });

  it("honors explicit TRACING_PROVIDER override and defaults to none when unconfigured", () => {
    expect(
      resolveTracingProvider({
        NODE_ENV: "production",
        TRACING_PROVIDER: "ddtrace",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://otel:4317",
        DD_AGENT_HOST: "datakit-service.observability-sit.svc",
      }),
    ).toBe("ddtrace");

    expect(
      resolveTracingProvider({
        NODE_ENV: "production",
        TRACING_PROVIDER: "none",
        DD_AGENT_HOST: "datakit-service.observability-sit.svc",
      }),
    ).toBe("none");

    expect(resolveTracingProvider({ NODE_ENV: "production" })).toBe("none");
  });

  it("resolves DDTrace agent host, port 9529 default, service, and env", () => {
    expect(
      resolveDDTraceConfig({
        NODE_ENV: "production",
        DD_AGENT_HOST: "datakit-service.observability-prod.svc",
        RUNTIME_ENV: "prod",
      }),
    ).toEqual({
      hostname: "datakit-service.observability-prod.svc",
      port: "9529",
      service: "web-saas-console",
      env: "prod",
      logInjection: true,
    });
  });
});
