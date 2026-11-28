import { trace } from '@opentelemetry/api'
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { OTLPTraceExporter as OTLPHttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'

export { traceLogFields } from './traceLogFields'

;(globalThis as { __OTEL_TRACE_API__?: typeof trace }).__OTEL_TRACE_API__ = trace

export type TracingProvider = 'otel' | 'ddtrace' | 'none'

export interface DDTraceRuntimeConfig {
  hostname: string
  port: string
  service: string
  env: string
  logInjection: boolean
}

let started = false
let activeProvider: TracingProvider = 'none'
let activeDDTracer: typeof import('dd-trace').default | null = null

function getGlobalDDTracer(): typeof import('dd-trace').default | null {
  return (globalThis as { __DD_TRACER__?: typeof import('dd-trace').default }).__DD_TRACER__ ?? null
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return 'unknown'
}

/**
 * Selects the active tracing backend with OTel-first mutual exclusion so HTTP
 * and Undici clients are never double-instrumented in the same Node process.
 */
export function resolveTracingProvider(env: NodeJS.ProcessEnv = process.env): TracingProvider {
  const explicit = env.TRACING_PROVIDER?.trim().toLowerCase()
  if (explicit === 'otel' || explicit === 'ddtrace' || explicit === 'none') {
    return explicit
  }

  const otelEndpoint = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim()
  if (otelEndpoint && env.OTEL_SDK_DISABLED?.trim().toLowerCase() !== 'true') {
    return 'otel'
  }

  const ddHost = env.DD_AGENT_HOST?.trim()
  if (ddHost && env.DD_TRACE_ENABLED?.trim().toLowerCase() !== 'false') {
    return 'ddtrace'
  }

  return 'none'
}

export function resolveDDTraceConfig(env: NodeJS.ProcessEnv = process.env): DDTraceRuntimeConfig {
  return {
    hostname: firstNonEmpty(env.DD_AGENT_HOST, 'datakit-service.datakit.svc'),
    port: firstNonEmpty(env.DD_TRACE_AGENT_PORT, '9529'),
    service: firstNonEmpty(env.DD_SERVICE, env.OTEL_SERVICE_NAME, 'web-saas-console'),
    env: firstNonEmpty(
      env.DD_ENV,
      env.OTEL_ENVIRONMENT,
      env.RUNTIME_ENV,
      env.NEXT_PUBLIC_RUNTIME_ENVIRONMENT,
      env.ENVIRONMENT,
    ),
    logInjection: env.DD_LOGS_INJECTION?.trim().toLowerCase() !== 'false',
  }
}

/**
 * Starts tracing for the resolved provider (OTel first, DDTrace fallback).
 */
export async function startTracing() {
  if (started) return

  const provider = resolveTracingProvider(process.env)
  if (provider === 'none') {
    console.warn('[tracing] Console tracing disabled: neither OTLP nor DD_AGENT_HOST is active')
    return
  }

  if (provider === 'ddtrace') {
    const preloaded = getGlobalDDTracer()
    if (preloaded) {
      activeDDTracer = preloaded
      activeProvider = 'ddtrace'
      started = true
      return
    }
    const cfg = resolveDDTraceConfig(process.env)
    const ddtrace = (await import('dd-trace')).default
    ddtrace.init({
      hostname: cfg.hostname,
      port: cfg.port,
      service: cfg.service,
      env: cfg.env,
      logInjection: cfg.logInjection,
    })
    activeDDTracer = ddtrace
    ;(globalThis as { __DD_TRACER__?: typeof ddtrace }).__DD_TRACER__ = ddtrace
    activeProvider = 'ddtrace'
    started = true
    console.info('[ddtrace] Console tracing started', {
      service: cfg.service,
      env: cfg.env,
      hostname: cfg.hostname,
      port: cfg.port,
    })
    return
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim()
  if (!endpoint) {
    console.warn('[otel] Console tracing disabled: no OTLP traces endpoint configured')
    return
  }

  const serviceName = firstNonEmpty(process.env.OTEL_SERVICE_NAME, 'web-saas-console')
  const environment = firstNonEmpty(
    process.env.OTEL_ENVIRONMENT,
    process.env.RUNTIME_ENV,
    process.env.NEXT_PUBLIC_RUNTIME_ENVIRONMENT,
    process.env.ENVIRONMENT,
  )
  const instance = firstNonEmpty(
    process.env.OTEL_SERVICE_INSTANCE_ID,
    process.env.INSTANCE,
    process.env.HOSTNAME,
    serviceName,
  )
  const useGrpc = process.env.OTEL_EXPORTER_OTLP_PROTOCOL?.trim().toLowerCase() === 'grpc'

  started = true
  activeProvider = 'otel'
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': serviceName,
      'service.instance.id': instance,
      'deployment.environment.name': environment,
      'deployment.environment': environment,
      environment,
      instance,
    }),
    traceExporter: useGrpc
      ? new OTLPGrpcTraceExporter({ url: endpoint })
      : new OTLPHttpTraceExporter({ url: endpoint }),
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation(),
    ],
  })

  console.info('[otel] Console tracing SDK starting', {
    serviceName,
    instance,
    environment,
    protocol: useGrpc ? 'grpc' : 'http/protobuf',
    sampler: process.env.OTEL_TRACES_SAMPLER || 'default',
  })
  sdk.start()
}
