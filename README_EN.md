<h1 align="center">Portal</h1>
<p align="center"><strong>Open Cloud Control Panel for Ops / Infra / AI | Cloud Neutral Toolkit 的开放云控制面板</strong></p>

<p align="center">
  <a href="https://console.svc.plus"><img src="https://img.shields.io/badge/Console-console.svc.plus-0B5C7A?style=for-the-badge" alt="Console" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-2F855A?style=for-the-badge" alt="Apache-2.0" /></a>
  <img src="https://img.shields.io/badge/Next.js-App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A518.17%20%3C25-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
</p>

<p align="center">
  <a href="README_ZH.md">🇨🇳 简体中文版</a> ｜ <strong>🌐 English Version</strong>
</p>

---

## 🌐 Project Overview

Portal is one Next.js frontend that keeps the marketing site, docs, account and console, and the AI Workspace in a single
codebase. It is built for Ops / Infra / AI, with technical freedom and portability as the goal.

Portal owns only UI, interaction, routing and server-side proxies. Account, session and subscription data come from
Accounts; models and tools come from the XWorkmate Bridge; site copy and docs come from the content service; runtime
configuration is delivered by GitOps.

### Engineering Principles

- **Clear boundaries**: one codebase is built into separate workers per boundary, and a guard script blocks cross-boundary navigation mistakes.
- **No stored secrets**: Stripe secret keys and webhook secrets never enter Portal; server-side tokens are read from environment variables only.
- **Content lives elsewhere**: site copy, product docs and blog posts are not added to Portal; the canonical source is `haitaopanhq/knowledge`.
- **Traceable releases**: images are built by CI and the target host only pulls them; version data is kept aligned across `/api/ping` and `validate`.

---

## 🏛️ Architecture

```text
Browser → Cloudflare / Caddy → frontend-router (dispatch by path prefix)
                               ├→ public     /*                       marketing site, product pages, pricing
                               ├→ content    /docs /blogs /download   docs, blog, downloads
                               ├→ auth       /login /register ...     sign-in, sign-up, email verification
                               ├→ console    /panel /dashboard ...    account, team, subscription, integrations
                               └→ workspace  /ai-workspace /xworkmate /cloud_iac /support
                                               │
                                               ├→ /api/xworkmate, /api/ai-workspace/*  → XWorkmate Bridge, Accounts task sessions
                                               └→ /api/auth, /api/account …            → Accounts
```

The same source is built once per boundary into independent workers (public / content / auth / console / workspace);
local development and the all-in-one image use a single monolithic build. The path-prefix table comes from the GitOps
EdgeRoutingConfig, and `config/cloudflare-boundaries.json` in this repository is only a local fixture.

A page in another boundary is not part of the current build, so in-app links must use `BoundaryLink` (a plain
`next/link` within a boundary, a full-page navigation across one). `yarn check:boundary-links` rejects violations.

## 🧭 Key Routes

| Path | What it is |
|---|---|
| `/` | Home page: the conversation-to-delivery hero; copy and image can be overridden from CDN assets |
| `/products/*` | Product pages: XWorkmate, AI Workspace, Cloud Hub, XConnect, Open Platform and more |
| `/prices` | Plans and pricing; the plan catalog comes from Accounts |
| `/docs`, `/blogs` | Docs and blog, served by the content service |
| `/services` | Service navigation page |
| `/panel/*` | Console: account, team, subscription, AI Aggregator, Cloud Hub |
| `/panel/api` | Integration settings: configure and probe OpenClaw Gateway, Vault and APISIX AI Gateway (variables in `.env.example`) |
| `/ai-workspace` | The AI Workspace, see the next section |
| `/xworkmate` | Standalone XWorkmate online workspace; shares the same shell as `/ai-workspace` |
| `/cloud_iac/[provider]` | Cloud IaC catalog |

## 🤖 AI Workspace

`/ai-workspace` is the web version of the XWorkmate App home: one shell, one sidebar, and pages render only their own
content area.

- **Sidebar**: app mark and collapse button, task search, 工作台 / 新对话 / Bot 团队 (Workbench / New chat / Bot team),
  task groups (Gateway, cloud sessions, pinned tasks, shared projects) and a gear menu in the footer. When the sidebar is
  collapsed, the expand button appears in each page's top toolbar.
- **Conversation**: the top toolbar has the conversation workflow, render, the Bridge connection status and the toggle for
  the artifact pane on the right. When the Bridge is unreachable it shows a "connect the Bridge first" card.
- **Composer**: attachments, built-in plugins and six roles:
  `Chat ⟶ Worker ⟶ Engineer ⟶ Architect ⟷ Researcher ⟶ Specialist`.
  - **Chat** goes straight to the Bridge and answers immediately.
  - **Every other role** is run by the DS Bot team: 立即执行 (run now) waits for the result and brings it back into the
    conversation; 交给 Bot 团队 (hand off to the Bot team) returns at once and the task runs in the background, to be
    followed from the session or the Bot team page.
  - Guests can only use Chat; the Bot roles unlock once an account is confirmed.
- **Bot team** (`/ai-workspace/bot-team`): dispatch background tasks and see the account's task sessions.
- **Task hub** (`/ai-workspace/tasks`): the cross-agent task and shared-memory view.

Request flow: Chat goes through `/api/xworkmate/bridge` (guests use `/api/ai-workspace/free`) to the Bridge. Bot team
tasks go through `/api/ai-workspace/sessions/*` to the Accounts task-session API; the message carries
`routing: {roleMode: "auto", role}`, and the events are folded in sequence order into a state per run. Role names match
the XWorkmate App, so change them in both places together.

## 🚀 Quick Start

```bash
corepack enable          # the repo uses Yarn 4 (packageManager field)
yarn install --immutable
cp .env.example .env     # fill in as needed, see the next section
yarn dev                 # http://localhost:3000 by default
```

Requires Node.js `>=18.17 <25` (`.nvmrc` is 20). `yarn dev` first runs `scripts/Dev-MCP-Server.sh`, which starts Chrome
with a remote-debugging port (it uses the macOS Google Chrome path) and pre-warms `chrome-devtools-mcp`, then runs
`next dev --turbo`. Without macOS Chrome, run `yarn next dev --turbo` directly. Content for `/docs` and `/blogs` is served
by the content service.

`scripts/setup.sh` is provided as an initialization script (it only copies `.env.example` and writes no secrets); read it
before running it. Production deployments should use a reviewed tag / commit and the image built by CI, never a build on
the target host.

## 🔧 Environment Variables

Only the common ones are listed; the full list and defaults are in [`.env.example`](.env.example) and
[`docs/getting-started/installation.md`](docs/getting-started/installation.md). Variables with the `NEXT_PUBLIC_` prefix
are bundled into the browser and must hold public values only.

| Variable | Purpose |
|---|---|
| `ACCOUNT_SERVICE_URL` | Accounts service address: sign-in, sessions, subscriptions, task sessions |
| `BRIDGE_SERVER_URL` | XWorkmate Bridge base URL, used by the server-side proxy |
| `BRIDGE_AUTH_TOKEN` | Bridge bearer token, server-side only |
| `AI_WORKSPACE_AUTH_TOKEN` | Server-side fallback token for the task-session proxy, server-side only; used when a request has no account session |
| `DOCS_SERVICE_URL` | Content service for docs and blog |
| `NEXT_PUBLIC_HOME_HERO_*` | Content JSON, image base URL and version for the home hero, see [home assets](docs/integrations/homepage-hero-assets.md) |
| `NEXT_PUBLIC_STRIPE_PRICE_*` | Public Stripe `price_...` identifiers |

The Stripe secret key and webhook secret never enter Portal: Portal only submits the plan the user picked to Accounts.
See [Stripe setup](docs/integrations/stripe-billing.md) for integration steps.

## 📦 Build & Deploy

| Target | Command |
|---|---|
| Node server | `yarn build` → `yarn start` |
| Static dashboard | `yarn build:static-dashboard` |
| Cloudflare Workers (monolithic) | `yarn build:workers` |
| Per boundary | `yarn build:ssr:public`, `build:ssr:content`, `build:ssr:auth`, `build:ssr:console`, `build:ssr:workspace` |

Images are built and pushed by GitHub Actions, and the target host only pulls them; nothing is built on the host.
`Dockerfile` (all-in-one), `Dockerfile.frontend-server` and `Dockerfile.static-dashboard` correspond to the three runtime
shapes; see [`deploy/single-node`](deploy/single-node) for single-node orchestration. The release chain and the version
data in `/api/ping` follow [`skills/release-traceability`](skills/release-traceability/SKILL.md).

## ✅ Development & Verification

```bash
yarn typecheck
yarn test                       # Vitest unit tests
yarn test:e2e                   # Playwright
yarn check:boundary-links       # guard against cross-boundary soft navigation
yarn check:type-scale           # type-scale guard, see skills/ui-typography
./node_modules/.bin/eslint . --no-eslintrc --config .eslintrc.json --resolve-plugins-relative-to .
```

Follow the type scale when changing UI text; do not add arbitrary font sizes.

Tech stack: Next.js (App Router), TypeScript, Tailwind CSS, Radix UI, Zustand, Contentlayer.

## 📚 Documentation

| Document | Contents |
|---|---|
| [docs/README.md](docs/README.md) | Docs entry point, including the bilingual canonical pages |
| [Architecture overview](docs/architecture/overview.md) | Components, design decisions and roadmap |
| [Installation & configuration](docs/getting-started/installation.md) | Environment variables and local integration |
| [Deployment guide](docs/usage/deployment.md) | Single-node deployment and delivery model |
| [OIDC sign-in](docs/integrations/oidc-auth.md) | Identity integration |
| [Stripe setup](docs/integrations/stripe-billing.md) | Billing integration |
| [Cloudflare Web Analytics](docs/integrations/cloudflare-web-analytics.md) | Traffic analytics |
| [Vault & GitHub Actions](docs/operations/vault-github-actions.md) | Keyless CI secret access and role constraints, including 403 troubleshooting |
| [Release process](docs/governance/release-process.md) | Versions and release notes |
| [AGENTS.md](AGENTS.md) | Repository boundaries and change rules for people and AI agents |

The canonical source for site copy, product docs and technical blog posts is `haitaopanhq/knowledge`, and Portal no
longer adds static copy; runtime configuration is managed in `ai-workspace-infra/gitops`.
This project is licensed under [Apache-2.0](LICENSE).

---

<p align="center">
  <strong>Open · Portable · Observable · AI-Powered</strong><br/>
  <sub>开放 · 可迁移 · 可观测 · AI 驱动</sub>
</p>
