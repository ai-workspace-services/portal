// Next.js calls this hook before the Node.js server accepts requests. Keep the
// SDK out of the Edge runtime, which cannot load Node-only OpenTelemetry code.
export async function register() {
  // The standalone runtime can omit NEXT_RUNTIME from process.env after the
  // instrumentation entrypoint is copied out of the Next build. Only skip an
  // explicitly Edge execution; the Console server is Node.js by deployment.
  if (
    process.env.NEXT_RUNTIME === 'edge' ||
    process.env.TRACING_PROVIDER?.trim().toLowerCase() === 'none' ||
    (process.env.OTEL_SDK_DISABLED?.trim().toLowerCase() === 'true' &&
      process.env.DD_TRACE_ENABLED?.trim().toLowerCase() === 'false')
  ) {
    return
  }

  try {
    const { startTracing } = await import('./src/server/observability')
    await startTracing()
  } catch (error) {
    console.error('[otel] Console tracing initialization failed', error)
  }
}
