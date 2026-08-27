# AI Workspace Web parity design QA

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
