// Next.js calls this hook before the Node.js server accepts requests. Keep the
// SDK out of the Edge runtime, which cannot load Node-only OpenTelemetry code.
export async function register() {
  // The standalone runtime can omit NEXT_RUNTIME from process.env after the
  // instrumentation entrypoint is copied out of the Next build. Only skip an
  // explicitly Edge execution; the Console server is Node.js by deployment.
  if (process.env.NEXT_RUNTIME === 'edge') return

  try {
    const { startTracing } = await import('./src/server/observability')
    startTracing()
  } catch (error) {
    console.error('[otel] Console tracing initialization failed', error)
  }
}
