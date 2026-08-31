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
| 部署 (可选) | Cloudflare Workers / 自建 | 部署方式见 `docs/usage/deployment.md` |

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

### 首页主视觉远程资源 TL;DR

首页布局和默认文案保留在代码内，可通过公开的 S3/CDN 资源动态覆盖主视觉图片与卡片文案：

```dotenv
NEXT_PUBLIC_HOME_HERO_CONTENT_URL=https://assets.svc.plus/marketing/home-hero/content.json
NEXT_PUBLIC_HOME_HERO_MEDIA_BASE_URL=https://assets.svc.plus
NEXT_PUBLIC_HOME_HERO_ASSET_VERSION=2026-07-11.1
```

- `CONTENT_URL` 指向中英文 JSON 配置；加载失败时自动使用代码内默认内容。
- `MEDIA_BASE_URL` 是图片根地址，默认图片对象为 `marketing/home-hero.png`。
- `ASSET_VERSION` 作为 `?v=` 查询参数追加到 JSON 和图片 URL，用于切换发布版本及刷新 CDN 缓存。
- 三项均为 `NEXT_PUBLIC_*`，只能放公开地址和公开版本号，不能包含 S3 密钥或签名凭据。

完整 JSON 格式、S3 CORS 和发布示例见 [`docs/integrations/homepage-hero-assets.md`](docs/integrations/homepage-hero-assets.md)。

## Stripe 配置 (Stripe Billing Setup)

`/prices`、产品页和账户中心统一从 Accounts 的套餐目录读取可售计划和公开
`price_...` 标识。Portal 只将用户选中的计划提交给 Accounts；Stripe Secret Key 和
Webhook Secret 都不进入 Portal 构建或运行时环境。

联调步骤见 `docs/integrations/stripe-billing.md`。

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

## CI/CD 与 Vault 鉴权 (Vault OIDC Role)

本仓库的持续集成流水线 (`.github/workflows/ci-pipeline.yml`) 使用 GitHub Actions OIDC 机制与 HashiCorp Vault (`vault.svc.plus`) 进行无密钥身份认证。

为了遵循最小权限原则（Least Privilege）和环境隔离，本仓库的 CI 拥有独立的 Vault Policy 和 Role，具体安全约束如下：

1. **凭据访问范围（路径隔离）**
   - CI 流水线仅拥有 `kv/data/CICD` 的**只读**权限。
   - 该路径仅包含基础的公共服务凭据（例如 GHCR_USERNAME 和 GHCR_TOKEN），用于构建完成后推送镜像。
   - CI 无法读取任何环境特有的底层云资源凭据、Terraform State 或主机 SSH 部署私钥。

2. **身份铸造限制（绑定收紧）**
   - 本服务在 Vault 中对应 3 个独立环境的 Role（`sit`、`uat`、`prod`）。
   - **`job_workflow_ref` 白名单钉死**：Vault 强制校验调用方的流水线文件。只有本仓库白名单内的流水线（即 `ci-pipeline.yml`）发起的请求才能成功换取 Token。
   - 仓库内任何人**新增**或**重命名**未经授权的 workflow 文件，皆无法绕过限制获取凭据。

> **⚠️ 排障指南 (403 Forbidden)**
> 如果 CI 流水线在 `Fetch Vault Secrets` 步骤报 `403` 权限拒绝，请确认：
> 1. 请求的凭据路径是否超出了 `kv/data/CICD` 层的范围。
> 2. 流水线文件名称或仓库名称是否发生了变更。
> 
> 如果确需修改流水线名称，必须由管理员在 `platform-ops-toolkit` 仓的 `docs/tasks/vault_service_repo_roles.sh` 中更新白名单，并重新对 Vault 服务端执行该脚本。
