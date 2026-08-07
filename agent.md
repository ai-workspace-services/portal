# Agent Operating Rules

You are an AI agent working inside this repository.

## Role

- Act as a senior engineer and automation assistant.
- Prioritize correctness, minimal changes, and reproducibility.
- agent.md mirrors AGENTS.md; when in doubt, follow AGENTS.md as the source of truth.

## Global Rules

- Do not introduce new dependencies unless explicitly requested.
- Do not change API contracts without explicit instruction.
- Do not add new environment variables without approval.
- Keep changes scoped to the request; avoid unrelated refactors.
- Prefer minimal edits that preserve existing behavior and style.

## Release Traceability Default Rule

- For changes touching CI/CD, image tags, deploy contracts, `/api/ping`, or `validate`, treat `skills/release-traceability/SKILL.md` as the default reference first.
- Keep build output, runtime version, and validate output aligned through the whole release chain.
- Do not add a deploy path that rebuilds images on the target host.

## Repository Constraints (Quick View)

- App layer: src/app/**, src/components/**, src/lib/**, src/state/**, src/modules/\*\*
- Library layer: packages/\*\* (no @/ aliases, no global state)
- Global state: Zustand only, in src/state/** or src/app/store/**
- URL-synced state must live in Zustand slices

## Testing Policy

- Follow mcp/testing.md for minimal verification.
- Always run the minimal verification after a coherent change-set.

## Output Format

Always respond with:

1. Summary of changes
2. Commands executed
3. Result (success/failure)
4. Next step

If these rules conflict with user instructions, ask once for clarification and proceed conservatively.

## XWorkmate Desktop-to-Web Adaptation Guidelines

When porting or aligning features from `xworkmate-app` (Flutter Desktop) to `portal` (Next.js Web):

- **Dual Collapsible Sidebars**:
  - **Left Sidebar**: Must support full hiding. When hidden, render a floating reveal rail button (`ChevronsRight` / `>>`) at top-left (`position: absolute; left: 12px; top: 12px`) so users can reopen the sidebar from anywhere.
  - **Right Context Panel**: Must support full collapse. When collapsed, provide an explicit trigger in the top header (e.g., "上下文" toggle button) to reopen the drawer.

- **Composer (Input Area) Aesthetics**:
  - High-fidelity rounded pill style (`rounded-[28px]` or `rounded-3xl`).
  - Clean, borderless textarea with contextual placeholders (e.g., "尽管问，或做个 Agent 任务...").
  - Bottom action bar containing the `+` tool popover trigger on the left, mode selector (e.g., "快速 进阶 ∨") and circular submit button (`↑`) on the right.

- **Bridge API & Token Proxy**:
  - Pass requests to `https://xworkmate-bridge.svc.plus` via Next.js API route proxy (`/api/ai-workspace/[...path]`).
  - Automatically forward user session headers (`cookie`, `authorization`, `x-account-session`) to bypass CORS and reuse authentication state.

