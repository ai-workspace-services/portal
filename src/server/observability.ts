import { trace } from '@opentelemetry/api'
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { OTLPTraceExporter as OTLPHttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'

let started = false

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return 'unknown'
}

/**
 * Starts tracing only when a collector endpoint is explicitly configured.
 * The deployment supplies a parent-based 5% sampler; incoming k6 traceparent
 * headers retain their sampling decision and remain correlated end to end.
 */
export function startTracing() {
  if (started || process.env.OTEL_SDK_DISABLED === 'true') return

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

export function traceLogFields(): Record<string, string> {
  const activeSpan = trace.getActiveSpan()
  const spanContext = activeSpan?.spanContext()
  return {
    trace_id: spanContext?.traceId ?? '',
    span_id: spanContext?.spanId ?? '',
    service_name: firstNonEmpty(process.env.OTEL_SERVICE_NAME, 'web-saas-console'),
    instance: firstNonEmpty(
      process.env.OTEL_SERVICE_INSTANCE_ID,
      process.env.INSTANCE,
      process.env.HOSTNAME,
      process.env.OTEL_SERVICE_NAME,
      'web-saas-console',
    ),
    environment: firstNonEmpty(
      process.env.OTEL_ENVIRONMENT,
      process.env.RUNTIME_ENV,
      process.env.NEXT_PUBLIC_RUNTIME_ENVIRONMENT,
      process.env.ENVIRONMENT,
    ),
  }
}
