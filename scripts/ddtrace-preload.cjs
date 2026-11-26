'use strict'

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return 'unknown'
}

function resolveProvider(env) {
  const explicit = (env.TRACING_PROVIDER || '').trim().toLowerCase()
  if (explicit === 'otel' || explicit === 'ddtrace' || explicit === 'none') {
    return explicit
  }

  const otelEndpoint = (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || '').trim()
  if (otelEndpoint && (env.OTEL_SDK_DISABLED || '').trim().toLowerCase() !== 'true') {
    return 'otel'
  }

  const ddHost = (env.DD_AGENT_HOST || '').trim()
  if (ddHost && (env.DD_TRACE_ENABLED || '').trim().toLowerCase() !== 'false') {
    return 'ddtrace'
  }

  return 'none'
}

if (resolveProvider(process.env) === 'ddtrace' && !globalThis.__DD_TRACER__) {
  try {
    const tracer = require('dd-trace')
    const hostname = firstNonEmpty(process.env.DD_AGENT_HOST, 'datakit-service.datakit.svc')
    const port = firstNonEmpty(process.env.DD_TRACE_AGENT_PORT, '9529')
    const service = firstNonEmpty(process.env.DD_SERVICE, process.env.OTEL_SERVICE_NAME, 'web-saas-console')
    const env = firstNonEmpty(
      process.env.DD_ENV,
      process.env.OTEL_ENVIRONMENT,
      process.env.RUNTIME_ENV,
      process.env.NEXT_PUBLIC_RUNTIME_ENVIRONMENT,
      process.env.ENVIRONMENT,
    )
    const logInjection = (process.env.DD_LOGS_INJECTION || '').trim().toLowerCase() !== 'false'

    tracer.init({ hostname, port, service, env, logInjection })
    globalThis.__DD_TRACER__ = tracer
    console.info('[ddtrace] Preloaded tracer before app modules', { service, env, hostname, port })
  } catch (error) {
    console.error('[ddtrace] Preload initialization failed', error)
  }
}
