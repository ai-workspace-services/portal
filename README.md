# console.svc.plus

Cloud Neutral Toolkit 的开放云控制面板 (Open Cloud Control Panel).

面向 **Ops / Infra / AI** 的统一前端仪表盘，强调技术自由与可迁移性。

> A unified dashboard for Ops / Infra / AI, built for technical freedom and portability.

## 部署要求 (Deployment Requirements)

| 维度        | 要求 / 规格        | 说明                                  |
| ----------- | ------------------ | ------------------------------------- |
| Node.js     | `>=18.17 <25`      | 推荐使用 `.nvmrc`                     |
| 包管理      | Yarn (推荐) 或 npm | Yarn 推荐配合 Corepack                |
| Git         | 必需               | 用于拉取仓库                          |
| 部署 (可选) | Vercel / 自建      | 部署方式见 `docs/usage/deployment.md` |

## 快速开始 (Quickstart)

### 一键初始化 (Setup Script)

```bash
curl -fsSL "https://raw.githubusercontent.com/x-evor/console.svc.plus/main/scripts/setup.sh?$(date +%s)" \
  | bash -s -- console.svc.plus
```

### 本地运行 (Local Dev)

```bash
yarn dev
```

如果需要环境变量：

```bash
cp .env.example .env
```

如果你的工作区同时包含 `openclaw-deploy-example`，建议参考 `../openclaw-deploy-example/.env` 填写 AI 助手联调配置，并同时查看 `docs/getting-started/installation.md`。

## 主要入口 (Key Routes)

- `/services`：服务导航页，保留现有控制台布局。
- `/xworkmate`：原生 Next.js 的 XWorkmate 在线工作区，底层通过 `xworkmate-bridge` 的 `/acp/rpc` 接入。
- `/panel/api`：融合设置与集成页，用于配置和探测 OpenClaw Gateway、Vault Server、APISIX AI Gateway。

## AI 助手与集成能力 (Assistant & Integrations)

当前主页 AI 辅助功能已经基于本仓库原生实现，核心行为如下：

- 侧栏助手模式保留现有交互方式，但 `/xworkmate` 主工作区直接对接 `xworkmate-bridge`。
- 最大化助手页面统一收敛到 `/xworkmate`，旧的 `/services/openclaw` 只保留兼容跳转，不再继续使用旧的 control UI 套壳。
- 页面截图通过 assistant chat 附件模式发送，而不是单独的浏览器控制壳。
- `/panel/api` 仍保留旧集成配置入口；`/xworkmate` 主路径不依赖它。
- bridge 地址与令牌从服务端环境变量读取，前端组件不硬编码敏感配置。

## 环境变量 (Environment Variables)

以下变量用于 `/xworkmate` 主工作区的服务端 bridge 代理：

| 变量                | 用途                                  |
| ------------------- | ------------------------------------- |
| `BRIDGE_SERVER_URL` | XWorkmate bridge 服务根地址           |
| `BRIDGE_AUTH_TOKEN` | XWorkmate bridge bearer token，服务端 |

以下变量用于旧助手和集成页的服务端默认值预填：

| 变量                          | 用途                                 |
| ----------------------------- | ------------------------------------ |
| `OPENCLAW_GATEWAY_REMOTE_URL` | OpenClaw gateway 远端 WebSocket 地址 |
| `OPENCLAW_GATEWAY_TOKEN`      | OpenClaw gateway 访问令牌            |
| `VAULT_SERVER_URL`            | Vault 服务地址                       |
| `VAULT_NAMESPACE`             | Vault namespace，可选                |
| `VAULT_TOKEN`                 | Vault 探测令牌                       |
| `APISIX_AI_GATEWAY_URL`       | APISIX AI Gateway 地址               |
| `AI_GATEWAY_ACCESS_TOKEN`     | APISIX AI Gateway 探测令牌           |

更多说明见 `docs/getting-started/installation.md` 和 `.env.example`。

## Stripe 配置 (Stripe Billing Setup)

`/prices`、产品页和账户中心的购买入口现在统一读取前端公开的 Stripe `price_id`：

| 变量                                               | 用途                |
| -------------------------------------------------- | ------------------- |
| `NEXT_PUBLIC_STRIPE_PRICE_XSTREAM_PAYGO`           | Xstream 按量购买    |
| `NEXT_PUBLIC_STRIPE_PRICE_XSTREAM_SUBSCRIPTION`    | Xstream 订阅        |
| `NEXT_PUBLIC_STRIPE_PRICE_XSCOPEHUB_PAYGO`         | XScopeHub 按量购买  |
| `NEXT_PUBLIC_STRIPE_PRICE_XSCOPEHUB_SUBSCRIPTION`  | XScopeHub 订阅      |
| `NEXT_PUBLIC_STRIPE_PRICE_XCLOUDFLOW_PAYGO`        | XCloudFlow 按量购买 |
| `NEXT_PUBLIC_STRIPE_PRICE_XCLOUDFLOW_SUBSCRIPTION` | XCloudFlow 订阅     |

这些值应填写为 Stripe Dashboard 中对应套餐的 `price_...` 标识。联调步骤见 `docs/integrations/stripe-billing.md`。

## 核心特性 & 技术栈 (Features & Tech Stack)

核心特性：

- 统一控制面：汇聚 Cloud Neutral Toolkit 各微服务入口
- 原生 AI 助手工作区：OpenClaw gateway 驱动的聊天、截图附件与会话体验
- 融合集成设置：在 `/panel/api` 统一管理 OpenClaw、Vault、APISIX AI Gateway
- 文档与内容系统：Contentlayer 驱动的 docs/content pipeline
- 可扩展集成：OIDC、Cloudflare Web Analytics 等

技术栈：

- Next.js + TypeScript
- Tailwind CSS + Radix UI
- Zustand
- Contentlayer

## 开发命令 (Useful Commands)

```bash
yarn dev
yarn build
yarn typecheck
./node_modules/.bin/eslint . --no-eslintrc --config .eslintrc.json --resolve-plugins-relative-to .
```

## 说明文档 (Docs)

入口：

- EN: `docs/README.md`
- ZH: `docs/zh/README.md`

常用链接：

- OIDC: `docs/integrations/oidc-auth.md`
- Cloudflare Web Analytics: `docs/integrations/cloudflare-web-analytics.md`
- Stripe billing: `docs/integrations/stripe-billing.md`
- Assistant / Integrations env setup: `docs/getting-started/installation.md`
- Chinese installation guide: `docs/zh/getting-started/installation.md`

其他：

- Agent rules: `AGENTS.md`
