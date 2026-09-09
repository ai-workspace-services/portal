import { describe, expect, it } from 'vitest'

import { buildVlessUri } from './vless'

const node = {
  name: 'agent-proxy-selfhost-prod.svc.plus',
  address: 'agent-proxy-selfhost-prod.svc.plus',
  port: 443,
  transport: 'xhttp' as const,
  path: '/split',
  mode: 'auto',
  uri_scheme_xhttp:
    'vless://${UUID}@${DOMAIN}:443?encryption=none&type=xhttp&security=tls&host=${DOMAIN}&path=${PATH}&mode=${MODE}&x_padding=&sni=${SNI}&fp=${FP}&alpn=h2%2Chttp%2F1.1%2Ch3#${TAG}',
}

describe('buildVlessUri', () => {
  it('keeps the canonical /split path and removes only empty XHTTP padding', () => {
    const uri = buildVlessUri('11111111-1111-4111-8111-111111111111', node)

    expect(uri).toContain('path=%2Fsplit')
    expect(uri).not.toContain('x_padding=')
    expect(uri).toContain('mode=auto')
    expect(uri).toContain('alpn=h2%2Chttp%2F1.1%2Ch3')
  })

  it('preserves a non-empty XHTTP padding value', () => {
    const uri = buildVlessUri('11111111-1111-4111-8111-111111111111', {
      ...node,
      uri_scheme_xhttp: node.uri_scheme_xhttp.replace('x_padding=', 'x_padding=abc'),
    })

    expect(uri).toContain('x_padding=abc')
  })

  it('rewrites a rendered node URI to the selected regional entrypoint', () => {
    const uri = buildVlessUri('01a061cc-9efe-77df-8003-3bea6da81dc5', {
      name: 'PH',
      address: 'ph-xconnect.svc.plus',
      server_name: 'ph-xconnect.svc.plus',
      port: 443,
      transport: 'xhttp',
      uri_scheme_xhttp:
        'vless://01a061cc-9efe-77df-8003-3bea6da81dc5@ph-surfercloud-01:443?encryption=none&type=xhttp&security=tls&host=ph-surfercloud-01&path=%2Fsplit&mode=auto&sni=ph-surfercloud-01&fp=chrome&alpn=h2%2Chttp%2F1.1%2Ch3#ph-surfercloud-01',
    })

    expect(uri).toBe(
      'vless://01a061cc-9efe-77df-8003-3bea6da81dc5@ph-xconnect.svc.plus:443?encryption=none&type=xhttp&security=tls&host=ph-xconnect.svc.plus&path=%2Fsplit&mode=auto&sni=ph-xconnect.svc.plus&fp=chrome&alpn=h2%2Chttp%2F1.1%2Ch3#ph-surfercloud-01',
    )
  })
})
