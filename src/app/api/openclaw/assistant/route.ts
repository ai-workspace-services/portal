import type { NextRequest } from 'next/server'

import {
  extractMessageText,
  makeAgentSessionKey,
  matchesSessionKey,
  normalizeMainSessionKey,
  type GatewayChatAttachmentPayload,
  type OpenClawBootstrapResponse,
  type OpenClawStreamEvent,
} from '@/lib/openclaw/types'
import { resolveOpenClawGatewayConfig } from '@/server/consoleIntegrations'
import { requireAdvancedServiceReadiness } from '@/server/account/serviceReadiness'
import { OpenClawGatewayClient, OpenClawGatewayError } from '@/server/openclaw/gateway-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BootstrapBody = {
  action: 'bootstrap'
  gatewayUrl?: string
  gatewayOrigin?: string
  gatewayToken?: string
  vaultUrl?: string
  vaultNamespace?: string
  vaultToken?: string
  vaultSecretPath?: string
  vaultSecretKey?: string
  agentId?: string
  sessionKey?: string
}

type SendBody = {
  action: 'send'
  gatewayUrl?: string
  gatewayOrigin?: string
  gatewayToken?: string
  vaultUrl?: string
  vaultNamespace?: string
  vaultToken?: string
  vaultSecretPath?: string
  vaultSecretKey?: string
  agentId?: string
  sessionKey?: string
  message?: string
  thinking?: string
  attachments?: GatewayChatAttachmentPayload[]
}

function jsonError(
  message: string,
  status = 400,
  code?: string,
  details?: Record<string, unknown> | null,
  deviceId?: string,
): Response {
  return Response.json(
    {
      error: message,
      code,
      details: details ?? null,
      ...(deviceId ? { deviceId } : {}),
    },
    { status },
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function gatewayErrorCode(error: OpenClawGatewayError | null): string | undefined {
  return error?.code ?? stringValue(asRecord(error?.details).code)
}

function formatGatewayError(error: OpenClawGatewayError | null, client: OpenClawGatewayClient): string {
  if (!error) {
    return 'Failed to connect to OpenClaw gateway.'
  }

  const details = asRecord(error.details)
  const detailCode = gatewayErrorCode(error)
  if (detailCode === 'PAIRING_REQUIRED') {
    const requestId = stringValue(details.requestId)
    const reason = stringValue(details.reason)
    return [
      '等待管理员审批当前设备后，X 助手才能继续连接。',
      requestId ? `requestId: ${requestId}` : '',
      client.deviceId ? `deviceId: ${client.deviceId}` : '',
      reason ? `reason: ${reason}` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return error.message
}

function resolveSessionKey(params: {
  sessionKey?: string
  agentId?: string
  mainSessionKey: string
}): string {
  const explicit = params.sessionKey?.trim()
  if (explicit) {
    return explicit
  }

  return makeAgentSessionKey(params.agentId?.trim() ?? '', params.mainSessionKey)
}

function resolveGatewayOrigin(override: string | undefined, request: NextRequest): string {
  const explicit = override?.trim()
  if (explicit) {
    return explicit
  }

  const headerOrigin = request.headers.get('origin')?.trim()
  if (headerOrigin) {
    return headerOrigin
  }

  return request.nextUrl.origin
}

async function handleBootstrap(body: BootstrapBody, request: NextRequest): Promise<Response> {
  const gateway = await resolveOpenClawGatewayConfig({
    gatewayUrl: body.gatewayUrl,
    gatewayToken: body.gatewayToken,
    vaultUrl: body.vaultUrl,
    vaultToken: body.vaultToken,
    vaultNamespace: body.vaultNamespace,
    vaultSecretPath: body.vaultSecretPath,
    vaultSecretKey: body.vaultSecretKey,
  })

  if (!gateway.gatewayUrl) {
    return jsonError('OpenClaw gateway URL is not configured.', 400, 'MISSING_GATEWAY_URL')
  }

  const client = new OpenClawGatewayClient()

  try {
    const connected = await client.connect({
      gatewayUrl: gateway.gatewayUrl,
      gatewayOrigin: resolveGatewayOrigin(body.gatewayOrigin, request),
      gatewayToken: gateway.gatewayToken,
    })

    const mainSessionKey = normalizeMainSessionKey(connected.mainSessionKey)
    const activeSessionKey = resolveSessionKey({
      sessionKey: body.sessionKey,
      agentId: body.agentId,
      mainSessionKey,
    })

    const [statusPayload, healthPayload, agents, sessions, messages] = await Promise.all([
      client.status(),
      client.health(),
      client.listAgents(),
      client.listSessions(body.agentId?.trim() || undefined, 24),
      client.loadHistory(activeSessionKey),
    ])

    const payload: OpenClawBootstrapResponse = {
      activeSessionKey,
      mainSessionKey,
      gatewayUrl: gateway.gatewayUrl,
      tokenSource: gateway.tokenSource,
      connectedAt: new Date().toISOString(),
      agents,
      sessions,
      messages,
      statusPayload,
      healthPayload,
    }

    return Response.json(payload)
  } catch (error) {
    const gatewayError = error instanceof OpenClawGatewayError ? error : null
    return jsonError(
      formatGatewayError(gatewayError, client),
      gatewayErrorCode(gatewayError) === 'OFFLINE' ? 503 : 502,
      gatewayErrorCode(gatewayError),
      gatewayError?.details ?? null,
      client.deviceId || undefined,
    )
  } finally {
    await client.close()
  }
}

async function handleSend(body: SendBody, request: NextRequest): Promise<Response> {
  const gateway = await resolveOpenClawGatewayConfig({
    gatewayUrl: body.gatewayUrl,
    gatewayToken: body.gatewayToken,
    vaultUrl: body.vaultUrl,
    vaultToken: body.vaultToken,
    vaultNamespace: body.vaultNamespace,
    vaultSecretPath: body.vaultSecretPath,
    vaultSecretKey: body.vaultSecretKey,
  })

  if (!gateway.gatewayUrl) {
    return jsonError('OpenClaw gateway URL is not configured.', 400, 'MISSING_GATEWAY_URL')
  }

  const message = body.message?.trim() ?? ''
  const attachments = Array.isArray(body.attachments) ? body.attachments : []

  if (!message && attachments.length === 0) {
    return jsonError('A message or attachment is required.', 400, 'EMPTY_MESSAGE')
  }

  const encoder = new TextEncoder()
  let client: OpenClawGatewayClient | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let activeSessionKey = body.sessionKey?.trim() ?? 'main'
      let activeRunId = ''
      let finalized = false
      let latestAssistantText = ''
      let stopListening = () => {}
      let finalTimer: NodeJS.Timeout | null = null

      const write = (event: OpenClawStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      const finalize = async (
        state: 'final' | 'aborted' | 'error',
        errorMessage?: string,
      ): Promise<void> => {
        if (finalized) {
          return
        }

        finalized = true
        stopListening()
        if (finalTimer) {
          clearTimeout(finalTimer)
          finalTimer = null
        }

        try {
          const [messages, sessions] = client
            ? await Promise.all([
                client.loadHistory(activeSessionKey),
                client.listSessions(body.agentId?.trim() || undefined, 24),
              ])
            : [[], []]

          write({
            type: 'final',
            state,
            messages,
            sessions,
            ...(errorMessage ? { errorMessage } : {}),
          })
        } finally {
          controller.close()
          if (client) {
            await client.close()
          }
        }
      }

      try {
        client = new OpenClawGatewayClient()
        const connected = await client.connect({
          gatewayUrl: gateway.gatewayUrl,
          gatewayOrigin: resolveGatewayOrigin(body.gatewayOrigin, request),
          gatewayToken: gateway.gatewayToken,
        })

        const mainSessionKey = normalizeMainSessionKey(connected.mainSessionKey)
        activeSessionKey = resolveSessionKey({
          sessionKey: body.sessionKey,
          agentId: body.agentId,
          mainSessionKey,
        })

        stopListening = client.onEvent((event) => {
          if (event.event === 'chat') {
            const payload = (event.payload ?? {}) as Record<string, unknown>
            const runId = typeof payload.runId === 'string' ? payload.runId : ''
            const state = typeof payload.state === 'string' ? payload.state : ''
            const incomingSessionKey =
              typeof payload.sessionKey === 'string' ? payload.sessionKey : activeSessionKey

            if (runId && activeRunId && runId !== activeRunId) {
              return
            }

            if (!matchesSessionKey(incomingSessionKey, activeSessionKey)) {
              return
            }

            const messagePayload = (payload.message ?? {}) as Record<string, unknown>
            const role = typeof messagePayload.role === 'string' ? messagePayload.role.toLowerCase() : ''
            const text = extractMessageText(messagePayload)

            if (
              role === 'assistant' &&
              text &&
              (state === 'delta' || state === 'final') &&
              text !== latestAssistantText
            ) {
              latestAssistantText = text
              write({
                type: 'delta',
                text,
              })
            }

            if (state === 'error') {
              void finalize(
                'error',
                typeof payload.errorMessage === 'string' ? payload.errorMessage : 'Chat failed.',
              )
              return
            }

            if (state === 'final' || state === 'aborted') {
              void finalize(state)
            }
            return
          }

          if (event.event === 'agent') {
            const payload = (event.payload ?? {}) as Record<string, unknown>
            const runId = typeof payload.runId === 'string' ? payload.runId : ''
            if (!runId || !activeRunId || runId !== activeRunId) {
              return
            }

            if (payload.stream !== 'assistant') {
              return
            }

            const data = (payload.data ?? {}) as Record<string, unknown>
            const text =
              typeof data.text === 'string' && data.text.trim().length > 0
                ? data.text
                : extractMessageText(data)

            if (text && text !== latestAssistantText) {
              latestAssistantText = text
              write({
                type: 'delta',
                text,
              })
            }
          }
        })

        activeRunId = await client.sendChat({
          sessionKey: activeSessionKey,
          message: message || 'See attached.',
          thinking: body.thinking?.trim() || 'high',
          attachments,
        })

        write({
          type: 'ack',
          runId: activeRunId,
          sessionKey: activeSessionKey,
        })

        finalTimer = setTimeout(() => {
          void finalize('error', 'Gateway stream timed out.')
        }, 45000)
      } catch (error) {
        const gatewayError = error instanceof OpenClawGatewayError ? error : null
        write({
          type: 'error',
          message: gatewayError?.message ?? 'Failed to send message to OpenClaw gateway.',
          ...(gatewayError?.code ? { code: gatewayError.code } : {}),
          ...(gatewayError?.details ? { details: gatewayError.details } : {}),
          ...(client?.deviceId ? { deviceId: client.deviceId } : {}),
        })
        controller.close()
        if (client) {
          await client.close()
        }
      }
    },
    async cancel() {
      if (client) {
        await client.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  const readinessGate = await requireAdvancedServiceReadiness(request)
  if (!readinessGate.allowed) return readinessGate.response

  let body: BootstrapBody | SendBody

  try {
    body = (await request.json()) as BootstrapBody | SendBody
  } catch {
    return jsonError('Invalid JSON body.', 400, 'INVALID_JSON')
  }

  if (body.action === 'bootstrap') {
    return handleBootstrap(body, request)
  }

  if (body.action === 'send') {
    return handleSend(body, request)
  }

  return jsonError('Unsupported assistant action.', 400, 'UNSUPPORTED_ACTION')
}
