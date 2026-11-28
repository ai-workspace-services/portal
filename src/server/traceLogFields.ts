type ActiveSpanContext = {
  traceId?: string
  spanId?: string
}

type ActiveOtelTraceApi = {
  getActiveSpan?: () => { spanContext?: () => ActiveSpanContext | undefined } | undefined
}

type ActiveDDTracer = {
  scope?: () => {
    active?: () => {
      context?: () => {
        toTraceId?: () => string
        toSpanId?: () => string
      } | null
    } | null
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return 'unknown'
}

/**
 * Emits trace/service metadata without importing Node-only OTel or dd-trace SDKs,
 * keeping Cloudflare Worker bundles lightweight while K3s Node Pods populate globals.
 */
export function traceLogFields(): Record<string, string> {
  const globals = globalThis as {
    __OTEL_TRACE_API__?: ActiveOtelTraceApi
    __DD_TRACER__?: ActiveDDTracer
  }

  const spanContext = globals.__OTEL_TRACE_API__?.getActiveSpan?.()?.spanContext?.()
  let traceId = spanContext?.traceId ?? ''
  let spanId = spanContext?.spanId ?? ''

  if (!traceId && globals.__DD_TRACER__) {
    const ddCtx = globals.__DD_TRACER__.scope?.()?.active?.()?.context?.()
    if (ddCtx) {
      traceId = ddCtx.toTraceId?.() ?? ''
      spanId = ddCtx.toSpanId?.() ?? ''
    }
  }

  return {
    trace_id: traceId,
    span_id: spanId,
    service_name: firstNonEmpty(process.env.DD_SERVICE, process.env.OTEL_SERVICE_NAME, 'web-saas-console'),
    instance: firstNonEmpty(
      process.env.OTEL_SERVICE_INSTANCE_ID,
      process.env.INSTANCE,
      process.env.HOSTNAME,
      process.env.DD_SERVICE,
      process.env.OTEL_SERVICE_NAME,
      'web-saas-console',
    ),
    environment: firstNonEmpty(
      process.env.DD_ENV,
      process.env.OTEL_ENVIRONMENT,
      process.env.RUNTIME_ENV,
      process.env.NEXT_PUBLIC_RUNTIME_ENVIRONMENT,
      process.env.ENVIRONMENT,
    ),
  }
}
