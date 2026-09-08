# AI Workspace Web parity design QA

## XConnect Zero three-page redesign — 2026-09-08

Source visual truth: `/Users/shenlan/.codex/generated_images/01a07cc6-1750-7fe0-a8fd-2da03a43c8e4/exec-1bab0cd5-2a9e-45d0-9241-f6c26e20cdb4.png`, with the supplied XConnect overview, node, IP and certificate captures.

Implementation capture: blocked pending a fresh local browser build. The code was reduced to the selected source's three primary destinations: Zero overview, node join, and configuration management. Type checking passed; the direct Vitest invocation is blocked by the repository's alias-resolution configuration (`@lib/xconnectZero`).

Findings: P1 visual comparison and browser interaction checks remain pending. The public UAT still serves the previous deployment and must not be used as evidence for this uncommitted change.

Final result: blocked

Date: 2026-08-28

Result: **BLOCKED for authenticated end-to-end sign-off; visual and responsive QA passed.**

## Reference and implementation captures

- Desktop reference: `/Users/shenlan/workspaces/ai-workspace-lab/xworkmate-app/images/Desktop-APP.png`
- Mobile reference: `/Users/shenlan/workspaces/ai-workspace-lab/xworkmate-app/images/mobile-app.PNG`
- Desktop implementation: `/tmp/xworkmate-portal-design-qa-20260828/design-qa-desktop-conversation.png`
- Mobile implementation: `/tmp/xworkmate-portal-design-qa-20260828/design-qa-mobile.png`
- Desktop side-by-side: `/tmp/xworkmate-portal-design-qa-20260828/design-qa-compare-desktop.png`
- Mobile side-by-side: `/tmp/xworkmate-portal-design-qa-20260828/design-qa-compare-mobile.png`

## Passed

- Desktop shell preserves the App hierarchy: task navigation, conversation header, central message surface, context controls, and bottom composer.
- Mobile shell provides a task drawer, safe header spacing, conversation/task/history bottom navigation, touch-sized controls, and no document-level horizontal overflow at 390 × 844.
- Workbench and conversation screens expose loading, empty, authentication error, and retry states without creating local fallback sessions.
- Session UI is projected from the Bridge snapshot and ordered events; Portal does not persist session truth or artifact payloads.
- Semantic tablist, navigation, alert, search, and button labels are present in the rendered DOM.

## Blocking external checks

- The local browser had no authenticated Portal account, so real cross-terminal history, message append, and task-state replay could not be exercised against a live Bridge principal.
- Accounts introspection must return a stable `accountId` before the new Bridge session REST endpoints will authorize requests. The endpoints intentionally fail closed without it.
- The production build compiles the changed Portal source successfully, then stops on the pre-existing `src/app/cloud_iac/[provider]/[service]/page.tsx` `PageProps.params` type mismatch.

## Release acceptance

Repeat the desktop and 390 × 844 checks with an authenticated UAT account after Accounts and Bridge are deployed. Confirm that a message submitted on one terminal appears on another through increasing event sequence numbers, and that no artifact binary, path, URL, attachment, or full tool output is written to PostgreSQL.

---

## Previous design QA records

The following records are preserved from earlier repository work.

# XWorkmate `/ai-workspace` Design QA

- Source visual truth: `docs/design/ai-workspace/data-overview.png`, `docs/design/ai-workspace/model-analysis.png`
- Implementation captures: `.design-qa/web-overview-final.jpg`, `.design-qa/web-model-analysis.png`
- Comparison evidence: `.design-qa/compare-overview.jpg`, `.design-qa/compare-model.jpg`
- Browser: Codex in-app browser, `http://localhost:4173/ai-workspace`
- Viewport: 1280 × 720 CSS px, device pixel ratio 2 for the normalized comparison captures
- Source pixels: 1487 × 1058; normalized to the implementation capture before comparison
- State: overview default; model-analysis selected; unauthenticated server response in local preview

## Full-view comparison

The implementation preserves the selected design's single-row five-tab navigation, right-aligned time range, black add action, card rhythm, blue contribution heatmap, two-column model analysis, and dense recent-session table. The live preview contains no local or demo data: the local browser lacks an account session and correctly renders the server error/empty state. Authenticated row values are therefore covered by component tests rather than invented for the screenshot.

## Focused comparison

- Navigation: label order, selected underline, spacing, and action placement match the source hierarchy.
- Overview: 4 × 2 metric grid, 12-month heatmap, legend, and recent-session table use the source proportions and palette.
- Model analysis: six compact metrics, stacked monthly token bars, model-share columns, and activity table match the source structure.
- Browser interaction: switched between 数据总览 and 模型分析; selected ARIA state changed correctly; 30日/7日 controls are wired; no console errors were recorded.

## Required fidelity surfaces

- Fonts and typography: system CJK sans stack, weights, truncation, numeric hierarchy, and table sizes match the reference intent.
- Spacing and layout rhythm: 12–20 px gaps, 12 px radii, one-pixel borders, responsive grid tracks, and full-height center canvas are consistent.
- Colors and visual tokens: gray-white surfaces, #1260cc selection blue, stepped heatmap blues, and semantic status colors match.
- Image quality and assets: the interface contains no raster content that needs approximation; Lucide icons are used for the reference's standard UI symbols.
- Copy and content: all five Chinese labels, metric names, chart titles, and table headers match the approved designs.

## Comparison history

1. Initial capture showed a browser focus rectangle around 模型分析. Added explicit button outline handling; the selected underline remains the sole mouse-selection treatment.
2. Initial desktop composition had two nested tab rows in the previous product implementation. Replaced it with the approved single-row five-tab navigation.
3. Local browser authentication prevents a same-data screenshot. Production code remains server-only; no fixture or local persistence was added to conceal this constraint.

## Findings

No actionable P0/P1/P2 visual differences remain in app-owned layout. The authentication message and zero values are an expected local account-state difference, not design drift.

## Follow-up polish

- P3: capture a production-authenticated screenshot after deployment to compare real table density and long model names.

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

---

# Management console design QA

## Comparison target

- Source visual truth: `docs/design/user-management-console-reference.png`
- Intended route: `/panel/management`
- Implementation capture: `../.product-design-audit/04-local-management-implementation.png`
- Browser viewport: 1366 × 768 CSS px, device scale factor 1.
- State: local development server, unauthenticated / unauthorised route state.

## Evidence and normalization

The source visual is a 1440 × 1024 management workspace with user metrics, a dense user table, and a persistent user inspector. The browser-rendered local implementation was captured at 1366 × 768, but the management route was blocked by the application access guard before its content could render. The two artifacts therefore do not represent the same authenticated state and cannot be compared for visual fidelity.

Focused-region comparison was not possible: the local capture only includes the access-denied state. The production browser session is authenticated, but it cannot render uncommitted local source changes, so it is not valid implementation evidence.

## Findings

- [P1] Authenticated visual verification is blocked.
  Location: local `/panel/management` route.
  Evidence: the browser capture renders `权限不足` and, after reload, redirects to `/login`; it does not render the new management workspace.
  Impact: full-view and focused design comparison with the approved reference is not yet possible.
  Fix: sign in to the local development environment with an administrator or operator account, then capture the management route at 1440 × 1024 and compare it against the saved reference.

## Implementation checklist

- [x] Save the approved reference under `docs/design/`.
- [x] Implement a 56px collapsed sidebar that expands on hover and can be pinned open from the header.
- [x] Implement the user-management workspace, filters, dense table, and user detail inspector using existing management callbacks.
- [x] Keep permissions, user groups, and homepage video settings available as page-level tabs.
- [x] Run TypeScript, targeted ESLint, and unit tests.
- [ ] Perform an authenticated browser capture and visual comparison.

## Follow-up polish

- Validate the compact layout at 1440 × 1024 and a narrower desktop breakpoint after an authenticated local session is available.

final result: blocked

---

# 用户组标签设计 QA（2026-09-04）

- Source visual truth: `/Users/shenlan/.codex/generated_images/01a06af1-10b0-7c71-a542-08f4406fe03b/exec-464521dd-5b9d-4967-a7b5-96f46229c6bd.png`（选定图 3）与成员来源环形图方向（图 1）。
- Implementation route: `/panel/management` → `用户组`。
- Implementation capture: `.design-qa/user-group-tags-preview-blocked.png`。
- Target viewport: 1440 × 1024 CSS px; local capture could not reach the target screen because the existing local dev server reports an HMR module-factory error before the route renders.
- State: selected subscription subgroup, a member selected for editing.

## Findings

- [P1] 本地浏览器预览被既有 Turbopack HMR 错误阻断。
  - Location: `src/app/panel/components/Header.tsx` importing `lucide-react`.
  - Evidence: `.design-qa/user-group-tags-preview-blocked.png` shows the runtime overlay before `/panel/management` renders. The error predates this component route and names `ChevronLeft` in the header, not the changed user-group component.
  - Impact: no browser-rendered implementation capture exists, so source and implementation cannot be placed in the same visual comparison input.
  - Fix: restart the local development server in a clean HMR state, authenticate as an admin/operator, then capture the group page at 1440 × 1024.

## Required fidelity surfaces

- Fonts and typography: blocked; browser-rendered evidence unavailable.
- Spacing and layout rhythm: blocked; browser-rendered evidence unavailable.
- Colors and visual tokens: blocked; browser-rendered evidence unavailable.
- Image quality and asset fidelity: no custom image assets were introduced; standard UI icons use the existing icon library. The source ring is implemented as a data visualization.
- Copy and content: reviewed in source; grouping, override, valid-period, import/export, and benefit labels are present in implementation source but require browser verification.

## Implementation checklist

- [x] Add Free, subscription parent/subgroups, and internal-user segmentation.
- [x] Persist manual group changes through the existing groups callback.
- [x] Add member import/export entry points and source filtering.
- [x] Add selected-member editor and automatic/manual composition ring.
- [x] Add clear validity-period and benefit UI, marked as non-persistent until the billing API supplies a read/write contract.
- [ ] Run an authenticated browser comparison after the local HMR blocker is cleared.

final result: blocked
---

# XConnect Zero design QA

- Source visual truth: `/Users/shenlan/.codex/generated_images/01a07cc6-1750-7fe0-a8fd-2da03a43c8e4/exec-d55ac019-cf63-42d6-bd51-c01495723f22.png`
- Browser implementation screenshot: `/Users/shenlan/workspaces/ai-workspace-xstream/portal-xconnect-zero-panel/design-qa-implementation.png`
- Side-by-side comparison: `/Users/shenlan/workspaces/ai-workspace-xstream/portal-xconnect-zero-panel/design-qa-comparison.png`
- Target viewport: desktop, 1440 CSS px wide
- State: Chinese locale, accounts control plane unavailable, Overview selected, accounts layer selected
- Source pixels: 1487 × 1058
- Implementation pixels: 1440 × 1136
- Capture normalization: the implementation shell was captured at a fixed 1440 CSS px width with image density scale 1. The source is the generated 1440-wide design result returned at 1487 physical px; both are shown proportionally in the 1904 × 798 side-by-side comparison.

## Full-view comparison evidence

The comparison preserves the selected direction's hierarchy: existing XWorkmate shell, compact title and health action, horizontal XConnect navigation, five-layer control-plane topology, contextual inspector, recent diagnostics, and grouped operational actions. The implementation uses the existing system font, CSS color tokens, 6–8 px radii, subtle borders, and restrained shadows.

The source mock contains illustrative node counts and event history. The implementation intentionally omits those values while the accounts API is unavailable, preserving the existing product contract that Portal must not fabricate networks, nodes, UUIDs, IP assignments, or policy state. When the live overview endpoint is available, the three supported counts are rendered from the response.

## Focused-region evidence

The original-resolution comparison keeps typography, topology cards, inspector labels, table rows, and action controls readable, so a separate crop was not needed. The GPG reset dialog was inspected live in Chrome: it has a named alert dialog, explicit destructive explanation, cancel controls, and a disabled write action that explains the missing accounts write adapter.

## Required fidelity surfaces

- Fonts and typography: passed. The implementation uses the project's Geist/system stack, compact 12–14 px operational text, a 24 px page heading, and consistent semibold hierarchy without clipping.
- Spacing and layout rhythm: passed. The page matches the source's shell/content split, top controls, five-part topology, narrow inspector, and two-column lower operations area. Mobile fallbacks stack the header, topology, inspector, and management content.
- Colors and visual tokens: passed. Existing primary, success, warning, danger, muted, border, focus, radius, and shadow tokens are used throughout; status meaning is reinforced by icons and labels.
- Image quality and asset fidelity: passed. The selected design contains no new raster imagery. Existing shell branding remains owned by the app, while interface icons use the project's installed icon library rather than custom SVG or CSS drawings.
- Copy and content: passed. Chinese and English copy is included. Unavailable-state text is honest about missing live data and the absent write adapter.
- Interactions and accessibility: passed. Overview, Nodes, IP allocation, Policies, and Certificates tabs work; topology layers update the inspector; retry reruns the live overview request; endpoint copy has an accessible label; focus styles are visible; GPG reset opens a named confirmation dialog; unavailable write controls are disabled.

## Comparison history

1. Initial capture was 952 × 1136 because the local assistant panel constrained the preview surface. This made the topology appear artificially cramped and was not a valid target-width comparison.
2. The preview-only capture was normalized to a fixed 1440 CSS px width and recaptured. The post-normalization comparison shows no actionable P0, P1, or P2 layout mismatch.

## Follow-up polish

- P3: add connector status glyphs between topology cards if the production shell later provides more horizontal room.
- P3: replace diagnostic rows with authoritative event timestamps when the accounts event API becomes available.

## Implementation checklist

- [x] Preserve the existing XWorkmate shell and design tokens.
- [x] Add multi-node topology and state-aware counts.
- [x] Add Overview, Nodes, IP allocation, Policies, and Certificates navigation.
- [x] Add UUID discovery/copy affordance without placeholder identifiers.
- [x] Add a guarded GPG certificate reset confirmation state.
- [x] Verify primary interactions in Chrome.
- [x] Compare the rendered implementation against the selected design.

final result: passed
