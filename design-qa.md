# `/panel/account` design QA

**Source visual truth**: `/Users/shenlan/Desktop/panel.png` (opened for review; XStream Dashboard reference, 1487 × 1058 px)

**Implementation screenshot**: not captured. The current environment has no authenticated browser/session that can render `/panel/account`; an unauthenticated capture would redirect or omit the account data and would not be a valid comparison.

**Viewport**: target desktop viewport matching the source screenshot; exact CSS viewport and device scale factor were not captured because authenticated rendering was unavailable.

**State**: authenticated account dashboard with populated subscription, quota, node, VLESS, policy, and security data — blocked before implementation capture.

## Comparison evidence

- Full-view source: reviewed from `/Users/shenlan/Desktop/panel.png`. The reference establishes the intended hierarchy: top summary, connection/node workspace, policy/security grouping, and restrained blue/green status tokens.
- Focused comparison: not performed. The implementation screenshot could not be captured in the same authenticated state, so typography, spacing, color, copy, image/QR fidelity, and responsive behavior cannot be judged against the source without false precision.
- Browser-rendered interactions, console errors, and authenticated states: not verified because no authenticated browser surface was available.

## Implementation intent

- `/panel/account` now groups existing account data into profile, billing/quota, VLESS connections/nodes, and policy/security sections.
- Node cards render only API-provided name, address, server name, ports, and protocols. No online, latency, load, audit, or traffic numbers were invented.
- Existing SWR keys and API routes, Stripe portal, cancellation, VLESS URI/QR generation, service readiness, and MFA setup flows remain in place.

## Findings

- [P0] Authenticated implementation capture is unavailable, so visual acceptance cannot be completed.
  Location: `/panel/account`.
  Evidence: no authenticated browser/session is available in this environment; no valid implementation screenshot exists.
  Impact: a source-to-render comparison would be speculative.
  Fix: run the task with an authenticated browser/session, capture the same desktop viewport, test primary interactions, and repeat this QA pass.

## Comparison history

No P0/P1/P2 visual iteration was run because the first implementation comparison was blocked before capture.

## Implementation checklist

- [x] Source screenshot opened and recorded.
- [x] Account page hierarchy implemented without adding backend fields.
- [x] Focused component tests and targeted lint completed.
- [ ] Capture authenticated implementation at the same viewport.
- [ ] Compare full view and focused connection/quota/security regions.
- [ ] Re-run interaction and console-error checks.

final result: blocked
