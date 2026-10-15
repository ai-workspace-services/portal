# Portal

Cloud Neutral Toolkit 的开放云控制面板。一个 Next.js 前端，把官网、文档、账户与控制台、AI Workspace 放在同一套源码里；
面向 Ops / Infra / AI，强调技术自由与可迁移性。

> A unified dashboard for Ops / Infra / AI, built for technical freedom and portability.

Portal 只负责 UI、交互、路由与服务端代理：账户、会话与订阅数据由 Accounts 提供，
模型与工具由 XWorkmate Bridge 提供，网站文案与文档由内容服务提供，运行时配置由 GitOps 下发。

## 架构

```text
浏览器 → Cloudflare / Caddy → frontend-router（按路径前缀分发）
                              ├→ public     /*                       官网、产品页、价格
                              ├→ content    /docs /blogs /download   文档、博客、下载
                              ├→ auth       /login /register ...     登录、注册、邮箱验证
                              ├→ console    /panel /dashboard ...    账户、团队、订阅、集成
                              └→ workspace  /ai-workspace /xworkmate /cloud_iac /support
                                              │
                                              ├→ /api/xworkmate、/api/ai-workspace/*  → XWorkmate Bridge、Accounts 任务会话
                                              └→ /api/auth、/api/account … → Accounts
```

同一份源码按 boundary 构建成多个独立 worker（public / content / auth / console / workspace），
本地开发与 all-in-one 镜像则是单体构建。路径前缀表来自 GitOps 的 EdgeRoutingConfig，
本仓库的 `config/cloudflare-boundaries.json` 只是本地 fixture。

跨 boundary 的目标页不在当前构建里，站内跳转必须用 `BoundaryLink`（同界为 `next/link`，跨界自动退回整页跳转），
`yarn check:boundary-links` 会拦截违规写法。

## 主要入口

| 路径 | 内容 |
|---|---|
| `/` | 首页：对话到交付的主视觉，可由 CDN 资源覆盖文案与图片 |
| `/products/*` | XWorkmate、AI Workspace、Cloud Hub、XConnect、开放平台等产品页 |
| `/prices` | 套餐与价格，套餐目录来自 Accounts |
| `/docs`、`/blogs` | 文档与博客，内容由内容服务提供 |
| `/services` | 服务导航页 |
| `/panel/*` | 控制台：账户、团队、订阅、AI Aggregator、Cloud Hub |
| `/panel/api` | 集成设置：OpenClaw Gateway、Vault、APISIX AI Gateway 的配置与探测（对应变量见 `.env.example`） |
| `/ai-workspace` | AI Workspace，见下节 |
| `/xworkmate` | 独立的 XWorkmate 在线工作区，与 `/ai-workspace` 共用同一个外壳 |
| `/cloud_iac/[provider]` | 云 IaC 目录 |

## AI Workspace

`/ai-workspace` 是 XWorkmate App 首页的 Web 版本：一个外壳、一个边栏，页面只渲染自己的内容区。

- **边栏**：应用标识与收起按钮、任务搜索、工作台 / 新对话 / Bot 团队、任务分组
  （Gateway、云端会话、置顶任务、共享工程）、底部齿轮菜单。收起后，展开按钮出现在各页面顶部工具栏。
- **对话**：顶部工具栏有对话工作流、渲染、Bridge 连接状态和右侧制品面板开关；
  Bridge 不可达时显示「先连接 Bridge」。
- **输入框**：附件、内置插件，以及 6 档角色
  `Chat ⟶ Worker ⟶ Engineer ⟶ Architect ⟷ Researcher ⟶ Specialist`。
  - **Chat** 直连 Bridge，立即得到回答。
  - **其余角色**交给 DS Bot 团队执行：「立即执行」等待结果并回到当前对话，
    「交给 Bot 团队」立即返回，任务在后台运行，可在会话或 Bot 团队页跟进。
  - 访客只能使用 Chat；Bot 角色在确认账号身份后才可选。
- **Bot 团队**（`/ai-workspace/bot-team`）：派发后台任务，查看账号下的任务会话。
- **任务中枢**（`/ai-workspace/tasks`）：跨 Agent 的任务与共享记忆视图。

请求流向：Chat 经 `/api/xworkmate/bridge`（访客为 `/api/ai-workspace/free`）到 Bridge；
Bot 团队任务经 `/api/ai-workspace/sessions/*` 到 Accounts 的任务会话 API，
消息携带 `routing: {roleMode: "auto", role}`，事件按序号折叠成每次运行的状态。
角色名与 XWorkmate App 一致，改动时两端需同步。

## 快速开始

```bash
corepack enable          # 仓库使用 Yarn 4（packageManager 字段）
yarn install --immutable
cp .env.example .env     # 按需填写，见下节
yarn dev                 # 默认 http://localhost:3000
```

要求 Node.js `>=18.17 <25`（`.nvmrc` 为 20）。
`yarn dev` 会先运行 `scripts/Dev-MCP-Server.sh`（启动带远程调试端口的 Chrome，路径为 macOS 的 Google Chrome，并预热 `chrome-devtools-mcp`），再执行 `next dev --turbo`；
没有 macOS Chrome 的环境直接运行 `yarn next dev --turbo`。`/docs`、`/blogs` 的内容由内容服务提供。

仓库提供 `scripts/setup.sh` 作为初始化脚本（只复制 `.env.example`，不写入密钥），运行前请先阅读内容。
生产部署应使用已审核的 tag / commit 和 CI 产出的镜像，不要在目标主机上构建。

## 环境变量

只列常用项，完整清单和默认值见 [`.env.example`](.env.example) 与
[`docs/getting-started/installation.md`](docs/getting-started/installation.md)。
带 `NEXT_PUBLIC_` 前缀的变量会打进浏览器端，只能放公开值。

| 变量 | 用途 |
|---|---|
| `ACCOUNT_SERVICE_URL` | Accounts 服务地址：登录、会话、订阅、任务会话 |
| `BRIDGE_SERVER_URL` | XWorkmate Bridge 服务根地址，服务端代理使用 |
| `BRIDGE_AUTH_TOKEN` | Bridge bearer token，仅服务端 |
| `AI_WORKSPACE_AUTH_TOKEN` | 任务会话代理的服务端回退令牌，仅服务端；请求没有账号会话时使用 |
| `DOCS_SERVICE_URL` | 文档与博客内容服务 |
| `NEXT_PUBLIC_HOME_HERO_*` | 首页主视觉的内容 JSON、图片根地址与版本号，见 [首页资源](docs/integrations/homepage-hero-assets.md) |
| `NEXT_PUBLIC_STRIPE_PRICE_*` | 公开的 Stripe `price_...` 标识 |

Stripe Secret Key 与 Webhook Secret 不进入 Portal：Portal 只把用户选中的套餐提交给 Accounts，
联调见 [Stripe 配置](docs/integrations/stripe-billing.md)。

## 构建与部署

| 目标 | 命令 |
|---|---|
| Node 服务 | `yarn build` → `yarn start` |
| 静态仪表盘 | `yarn build:static-dashboard` |
| Cloudflare Workers（单体） | `yarn build:workers` |
| 按 boundary 构建 | `yarn build:ssr:public`、`build:ssr:content`、`build:ssr:auth`、`build:ssr:console`、`build:ssr:workspace` |

镜像由 GitHub Actions 构建并推送，目标主机只拉取镜像，不在本机构建。
`Dockerfile`（all-in-one）、`Dockerfile.frontend-server`、`Dockerfile.static-dashboard` 分别对应三种运行形态，
单节点编排见 [`deploy/single-node`](deploy/single-node)。
发布链路和 `/api/ping` 的版本信息遵循 [`skills/release-traceability`](skills/release-traceability/SKILL.md)。

## 开发与验证

```bash
yarn typecheck
yarn test                       # Vitest 单元测试
yarn test:e2e                   # Playwright
yarn check:boundary-links       # 跨 boundary 软导航守卫
yarn check:type-scale           # 字号阶梯守卫，规范见 skills/ui-typography
./node_modules/.bin/eslint . --no-eslintrc --config .eslintrc.json --resolve-plugins-relative-to .
```

改动 UI 文字请遵守字号阶梯，不要新增任意值字号。

技术栈：Next.js（App Router）、TypeScript、Tailwind CSS、Radix UI、Zustand、Contentlayer。

## 文档导航

| 文档 | 内容 |
|---|---|
| [docs/README.md](docs/README.md) | 文档总入口，含中英文规范页 |
| [架构概览](docs/architecture/overview.md) | 组件、设计决策与路线图 |
| [安装与配置](docs/getting-started/installation.md) | 环境变量与本地联调 |
| [部署指南](docs/usage/deployment.md) | 单节点部署与交付模型 |
| [OIDC 登录](docs/integrations/oidc-auth.md) | 身份认证集成 |
| [Stripe 配置](docs/integrations/stripe-billing.md) | 计费联调 |
| [Cloudflare Web Analytics](docs/integrations/cloudflare-web-analytics.md) | 访问统计 |
| [Vault 与 GitHub Actions](docs/operations/vault-github-actions.md) | CI 无密钥取密与角色约束，含 403 排障 |
| [发布流程](docs/governance/release-process.md) | 版本与发布记录 |
| [AGENTS.md](AGENTS.md) | 给人和 AI Agent 的仓库边界与改动规则 |

网站文案、产品文档与技术博客的权威来源是 `haitaopanhq/knowledge`，Portal 不再新增静态文案；
运行时配置由 `ai-workspace-infra/gitops` 管理。
本项目使用 [Apache-2.0](LICENSE) 许可证。
