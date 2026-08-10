// Next.js calls this hook before the Node.js server accepts requests. Keep the
// SDK out of the Edge runtime, which cannot load Node-only OpenTelemetry code.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { startTracing } = await import('./src/server/observability')
  startTracing()
}
