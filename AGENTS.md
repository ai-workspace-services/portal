# Agent Guidelines for dashboard/

These rules apply to the entire dashboard repository.
They exist to keep architecture stable when humans or AI agents modify code.

This repo contains:

- A large Next.js App Router application (dashboard)
- Vendored internal libraries under packages/\*
- No monorepo tooling assumptions beyond local file dependencies

AI agents MUST respect these boundaries.

---

## 1. Build, Lint & Test Commands

### Development

```bash
yarn dev              # Start development server with MCP server
yarn build            # Production build (runs prebuild scripts)
yarn build:static     # Static build (includes prebuild)
yarn start            # Start production server
yarn preview          # Build and start production server
```

### Code Quality

```bash
yarn lint             # Run ESLint (currently fails under Next 16 CLI; use eslint command below)
./node_modules/.bin/eslint . --no-eslintrc --config .eslintrc.json --resolve-plugins-relative-to .  # Run ESLint directly (ignore parent configs)
yarn typecheck        # TypeScript type checking
yarn format           # Format code with Prettier
```

### Testing

```bash
yarn test             # Run unit tests (Vitest)
yarn test:unit        # Run unit tests explicitly
yarn test:e2e         # Run E2E tests (Playwright)

# Run a single unit test file
yarn test path/to/file.test.ts
yarn test --run path/to/file.test.ts

# Run a single Playwright spec
yarn test:e2e path/to/spec.test.ts
```

---

## 2. Release Traceability Default Rule

For any change touching CI/CD, image tags, deploy contracts, `/api/ping`, or `validate` behavior:

- Treat `skills/release-traceability/SKILL.md` as the default reference before implementation.
- Prefer release metadata that can be traced from `build` to `deploy` to `validate` without manual injection.
- Keep the published image reference, runtime version, and validation output aligned.
- Do not introduce a deploy path that rebuilds images on the target host.

When in doubt, follow the skill first and keep the release chain fully auditable end to end.

---

## 3. Portal Content Architecture Default Rule

Portal is evolving into a pure Next.js/React frontend. For any static
user-facing copy, product marketing, documentation, blog, localization, or
Git-backed content work:

- Treat `skills/portal-frontend-content-boundary/SKILL.md` as the default
  reference before implementation.
- Keep Portal responsible for UI, interaction, routing, and proxies only.
- Use `haitaopanhq/knowledge` as the canonical source for website copy,
  product documentation, and technical blogs.
- Keep deployment and runtime business configuration in
  `ai-workspace-infra/gitops`.
- Do not add new canonical static copy to Portal components, `src/data`, or
  localization files. Migrate the touched surface to the content contract.
- Do not introduce GitHub API, runtime Git content loading, or browser-editor
  dependencies for content publishing.

---

## 4. Repository Mental Model (Read This First)

This repository has **three clearly separated layers**:

### A. Application Layer (Next.js App Router)

src/app/**, src/components/**, src/lib/**, src/state/**, src/modules/\*\*

This is the **only place** where:

- Routing exists
- Global state exists
- Runtime config is loaded
- Zustand is allowed

### B. Vendored Library Layer

packages/neurapress/\*\*

This is a **library**, not an application. It may contain:

- React components
- Editor logic
- Markdown utilities
- Styles and assets

It MUST NOT:

- Behave like a Next.js app
- Depend on dashboard routing or aliases
- Own global state

### C. Build / Runtime Glue

scripts/**, config/**, public/\*\*

Used for build-time or runtime wiring only.

---

## 5. Import & Alias Rules (Critical)

### Dashboard code (src/\*\*)

- Allowed: `import { X } from "@/components/X"`
- Group imports: React → third-party → local types → local components

```ts
import React, { useEffect } from "react";
import { Button } from "@radix-ui/react-button";
import type { User } from "@/types/user";
import { UserCard } from "@/components/UserCard";
```

### Vendored packages (packages/\*\*)

- 🚫 ABSOLUTELY FORBIDDEN: `@/` aliases inside packages
- ✅ Use relative imports or package exports

---

## 6. TypeScript & Formatting Rules

- Strict mode enabled
- Use `type` for type definitions, `interface` for object shapes
- Prefer explicit return types for public APIs
- Use `const` for variables that won't be reassigned
- Run Prettier via `yarn format` before finalizing changes
- Keep functions small; avoid large inline objects in JSX

---

## 7. Naming Conventions

- Components: PascalCase (`UserProfile.tsx`)
- Files: kebab-case for utilities (`user-utils.ts`), PascalCase for components
- Variables: camelCase (`userName`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Types: PascalCase with `T` prefix for generic types (`TUser`)

---

## 8. Error Handling & Logging

- Use try/catch for async operations
- Return Result types or throw errors consistently
- Log errors with context, never expose stack traces to users
- Avoid swallowing errors without comment or fallback

---

## 9. React Patterns

- Use `'use client'` directive for client components
- Prefer function components with hooks
- Use `React.memo` for expensive components
- Avoid inline functions in render props

---

## 10. Global State Rules (Dashboard Only)

✅ Zustand is the **only** allowed global state mechanism
❌ React Context for shared/global state is forbidden

Allowed only in: src/state/**, src/app/store/**

Rule: If state must survive navigation or be shared → it lives in Zustand.

---

## 11. URL-Synchronized State

Anything involving:

- URL ↔ state
- Editor deep links
- Shareable views

MUST be handled inside Zustand slices.

❌ Forbidden:

- Parsing URL params inside components
- Sync logic inside useEffect

---

## 12. Component State Rules

Allowed:

- useState for local UI only
- useEffect for browser-only effects
- useRef for DOM access

Forbidden:

- useState for cross-component data
- Local state mirroring global state

---

## 13. packages/neurapress Rules (Very Important)

packages/neurapress is treated as a vendored internal library.

MUST:

- Keep its own internal structure
- Use relative imports or package exports
- Remain usable outside this repo
- Export public APIs via: src/index.ts, src/editor/index.ts, src/components/index.ts, src/lib/index.ts

MUST NOT:

- Assume Next.js App Router context
- Introduce app/, page.tsx, layout.tsx dependencies into dashboard
- Introduce Zustand, Context, or global state
- Depend on dashboard-specific CSS or runtime config

---

## 14. Testing Guidelines

- Unit tests: Vitest with jsdom environment
- E2E tests: Playwright
- Test files: `*.test.{ts,tsx}` or `__tests__/**/*`
- Use `describe`, `it`, `expect` from Vitest
- Mock external dependencies in test setup

---

## 15. Environment & Runtime Config

- No new environment variables without approval
- Runtime config must live in: src/config/runtime-service-config\*.yaml
- Runtime config is hydrated in dashboard only
- packages/\* must remain config-agnostic

---

## 16. Cursor / Copilot Rules

- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found

---

## 17. TL;DR for AI Agents

- dashboard = application
- packages = libraries
- Zustand only in dashboard
- No @/ imports inside packages
- Never "fix" libraries by polluting the app
- Always run `yarn lint` and `yarn typecheck` before completing tasks
- If `yarn lint` fails with "Invalid project directory .../lint" (Next 16 CLI), use `./node_modules/.bin/eslint .` instead

---

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

## Repository Constraints (Quick View)

- App layer: src/app/**, src/components/**, src/lib/**, src/state/**, src/modules/**
- Library layer: packages/** (no @/ aliases, no global state)
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

---

## 18. XWorkmate Desktop-to-Web Adaptation Guidelines

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
