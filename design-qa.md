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

---

# Homepage marketing carousel design QA

**Source visual truth**: the Web, Desktop App, and Mobile App screenshots supplied in this task, plus the generated carousel assets in `public/marketing/home-hero/`.

**Implementation screenshot**: not captured. Starting the local homepage at `http://localhost:3001/` stops at the Next.js build overlay because the existing project lacks OpenTelemetry modules (`@opentelemetry/exporter-trace-otlp-proto`, `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-undici`, and `@opentelemetry/sdk-node`).

**Viewport**: intended desktop homepage viewport; no browser-rendered implementation viewport is available while the build is blocked.

**State**: homepage, Chinese locale, first hero slide, with desktop screenshot grid.

## Comparison evidence

- Full-view source: three new 1536 × 1024 carousel assets represent one shared task session across Web, Desktop App, and Mobile App.
- Implementation capture: blocked by the existing dependency failure before the homepage renders.
- Static verification: both Chinese and English hero configurations point at the three generated assets; the screenshot grid uses `lg:grid-cols-4` and preserves the mobile horizontal scroller.

## Findings

- [P0] Browser-rendered homepage capture is unavailable.
  Location: local homepage preview.
  Evidence: Next.js reports missing OpenTelemetry dependencies before route rendering.
  Impact: the generated images and four-column layout cannot be visually compared in the browser.
  Fix: restore the missing dependencies, restart the local server, then capture and review the homepage at the target desktop and mobile breakpoints.

## Implementation checklist

- [x] Add Web, Desktop App, and Mobile App carousel images.
- [x] Update both locale configurations with the new three-slide sequence.
- [x] Make the product screenshot section four columns at the large desktop breakpoint.
- [x] Preserve mobile horizontal scrolling and all existing product links.
- [ ] Restore local dependencies and complete browser-rendered visual QA.

final result: blocked
