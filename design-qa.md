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

# Homepage unified AI Hero redesign QA

**Source visual truth**: `/var/folders/13/xrzs9z_n5ygb1nhxytxsf4480000gn/T/codex-clipboard-447631b2-5277-4ea6-8624-491df19ab97c.png` (2048 × 1080 px), with the user-directed change to remove the right-hand visual and rebuild the Hero as a centered logo row, message, supporting sentence, and free-trial CTA.

**Implementation screenshots**:

- `/tmp/xworkmate-hero-centered-desktop-final.png` — 2048 × 1080 px at a 2048 × 1080 CSS viewport, device scale factor 1.
- `/tmp/xworkmate-hero-centered-mobile-final.png` — 390 × 844 px at a 390 × 844 CSS viewport, device scale factor 1.
- `/tmp/xworkmate-hero-source-and-implementation.png` — normalized side-by-side comparison board, source on the left and implementation on the right.

**State**: public homepage `/`, light theme; Chinese and English locale states; registration CTA destination `/register`.

## Full-view comparison evidence

- The source's two-column structure and right-hand bordered AI card have been removed as explicitly requested. The implementation creates a single centered reading path: AI logo row → XWorkmate identity → core promise → supporting copy → trial CTA.
- Desktop hierarchy retains the source's restrained white canvas, dark display type, blue action color, spacious rhythm, and rounded brand surfaces while eliminating the image/carousel region.
- The 390 px layout preserves the same content order, gives the logo row deliberate horizontal scrolling, and measures 390 px document width with no page-level horizontal overflow.

## Focused-region comparison evidence

- Logo row: eleven local brand assets were visually inspected at desktop and mobile sizes. The compact icon-only treatment remains sharp, consistently spaced, and is not substituted with text initials or handcrafted artwork.
- Hero copy: Chinese and English headings, descriptions, and CTA labels were opened and read in the browser. Display wrapping is intentional and remains centered at both tested viewports.
- CTA: `免费试用 / Try it free` is keyboard-accessible as a link, exposes `/register`, and was clicked through successfully to the existing registration page.

## Required fidelity surfaces

- **Fonts and typography**: existing product font stack is preserved. The Hero uses a 5.35rem desktop display scale with tight tracking and 1.04 line height; mobile falls back to 2.25rem without clipping. Label and note weights retain clear hierarchy.
- **Spacing and layout rhythm**: the new section is vertically staged rather than split into grid columns. Logo, headline, body, and CTA groups have distinct gaps; mobile content fits within one Hero viewport and does not collide with navigation or the next section.
- **Colors and tokens**: existing primary blue, slate text, white background, border, and shadow tokens are reused. Contrast is clear and no unrelated palette was introduced.
- **Image quality and asset fidelity**: provider marks are local assets; Kimi is sourced from the official Kimi favicon and GLM from the official z.ai `logo.svg`, while the remaining marks use the pinned MIT-licensed Lobe Icons set. They render sharply and have no visible masking or compression artifacts.
- **Copy and content**: Chinese and English both express the same product promise. The supporting sentence and CTA are complete in both locales, and the CTA points to the actual registration workflow.

## Findings

- No actionable P0, P1, or P2 findings remain.
- [P3] The source used generic initial badges for several models, while the redesign uses real brand artwork. This is an intentional fidelity improvement aligned with the requested logo-focused presentation.

## Comparison history

1. First rendered pass showed the CTA note below the 900 px viewport and excessive desktop vertical centering. Reduced inter-group spacing and switched to top-staged Hero alignment.
2. Second pass made the full message visible but the logo row and headline read slightly small against the source's bold presentation. Increased desktop logo frames to 64 px and headline scale to 5.35rem.
3. Final pass confirmed desktop and mobile hierarchy, exact localized copy, no page-level horizontal overflow, working registration navigation, and zero console errors on fresh Chinese and persisted-English reloads.

## Primary interactions tested

- Changed language from Chinese to English and back.
- Reloaded after persisting English preference; English content returned without hydration warnings.
- Clicked `Try it free`; navigation reached `http://localhost:3000/register`.
- Checked fresh-page browser console in Chinese and persisted-English states; zero errors.

## Implementation checklist

- [x] Remove the right-side photo/card/carousel Hero region.
- [x] Add one horizontal AI model and agent logo row using real SVG assets.
- [x] Center the unified workspace message and supporting copy.
- [x] Add localized free-trial CTA to `/register`.
- [x] Support Chinese and English, including preference-safe reloads.
- [x] Verify desktop and 390 px mobile layouts, CTA navigation, and console state.
- [x] Pass TypeScript, targeted ESLint, and diff whitespace checks.

## final result: passed

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

---

Latest scoped result for the homepage unified AI Hero redesign: all required visual, responsive, localization, interaction, and console checks listed in this file passed. The blocked carousel result above is a historical review for a separate implementation.

final result: passed

---

# Pricing-page self-host and managed pay-as-you-go QA

**Source visual truth**: `/tmp/xwork-pricing-reference.png` — existing production pricing page captured from `https://console.xworktech.com/prices`.

**Implementation screenshot**: `/tmp/xwork-pricing-implementation.png` — local `/prices` capture after the requested pricing update.

**Viewport**: 1280 × 720 CSS px, desktop, light theme, Chinese. Both captures are 1280 × 720 pixels at 1× density; no normalization was needed.

**State**: public pricing page; Chinese, then English to validate locale-specific prices.

## Comparison evidence

- Full-view comparison: `/tmp/xwork-pricing-comparison.png` — production reference on the left, revised implementation on the right.
- Focused-region comparison: not needed. The above-the-fold pricing hierarchy, card count, card layout, copy, and CTAs are legible in the full view.
- The revised three-card lead intentionally replaces the former mixed product/SKU grid, making self-hosted free the first choice and managed pay-as-you-go the highlighted choice.
- The four XScopeHub/XCloudFlow subscription and usage cards are absent as requested; one scalable managed-services card replaces them.

## Required fidelity surfaces

- **Fonts and typography**: existing display and body styles are preserved; the new lead-card price remains legible at desktop width.
- **Spacing and layout rhythm**: the lead section uses a three-column desktop grid, avoiding the prior seven-card layout's cramped first row. XConnect core pricing now starts in a distinct lower section.
- **Colors and tokens**: existing background, border, primary CTA, recommendation badge, and surface tokens are retained.
- **Image quality and asset fidelity**: this page has no product imagery or decorative raster assets in the reviewed viewport; existing logo and icon treatment were preserved.
- **Copy and content**: Chinese uses CNY; the English state shows USD (`$0.15/GB`, `$3`, `$28`) and `List price + 20%`.

## Findings

- No actionable P0/P1/P2 differences remain relative to the requested change.
- [P3] When live Stripe Price IDs are ready, confirm that the USD display values align with the corresponding checkout catalog.

## Comparison history

1. Replaced the mixed SKU grid with the requested self-host-first and pay-as-you-go lead section.
2. Separated the retained XConnect cards into their own section to restore comfortable card widths and visual hierarchy.
3. Captured the revised page, compared it with the existing page at the same viewport, and rechecked locale-specific currency presentation.

## Primary interactions tested

- Changed language from Chinese to English and back.
- Self-host and managed-service CTAs retain their expected `/download` and `/panel/subscription` destinations.
- Checked the browser console; zero errors were reported.
- Passed TypeScript, lint, and diff whitespace checks.

## Implementation checklist

- [x] Place open-source self-hosting first and mark it free.
- [x] Promote managed services as pay-as-you-go at list price plus 20%.
- [x] Remove the specified XScopeHub and XCloudFlow card content.
- [x] Keep core XConnect plans, with RMB in Chinese and USD in English.

final result: passed

---

# AI Workspace 视觉验收

## 对照对象

- 线上参考：[console.svc.plus/ai-workspace](https://console.svc.plus/ai-workspace)
- 本地实现：[127.0.0.1:3000/ai-workspace?entry=trial](http://127.0.0.1:3000/ai-workspace?entry=trial)
- 本地最终截图：[design-qa-local.png](./design-qa-local.png)

## 检查结果

| 项目 | 结果 | 说明 |
| --- | --- | --- |
| 页面骨架 | 通过 | 左侧导航、工作台主内容、圆角容器和滚动边界完整 |
| 信息层级 | 通过 | 工作台标题、试用状态、核心指标、任务入口按优先级呈现 |
| 试用态 | 通过 | 显示 5/5 额度、注册后保存会话/下载制品，隐藏本地任务缓存 |
| 空状态 | 通过 | 访客模式提示下一步动作，不使用空泛的服务错误提示 |
| 响应式 | 通过 | 指标卡片在窄屏折为两列，操作区保持可用 |
| 交互状态 | 通过 | 刷新、时间范围切换、收起侧栏、开始新任务入口均保留 |

## 结论

最终结果：**通过**。本地页面已完成与线上工作台的视觉语言对齐，并针对 `entry=trial` 增加了明确的试用状态、注册转化提示和不保存任务的访客空状态。
