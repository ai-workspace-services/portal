import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'

let started = false

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

  started = true
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME?.trim() || 'web-saas-console',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation(),
    ],
  })

  console.info('[otel] Console tracing SDK starting', {
    serviceName: process.env.OTEL_SERVICE_NAME?.trim() || 'web-saas-console',
    sampler: process.env.OTEL_TRACES_SAMPLER || 'default',
  })
  sdk.start()
}
