# 前端交付拆分

`portal` 仓库输出两个独立的 Next.js 前端交付物，共享 `src` 中的 UI 组件和内容数据。

所有 Docker 交付物默认使用 Node.js 24；Next.js 与现有业务依赖版本保持不变。

## static-dashboard

纯静态 Next.js 应用，不包含 API Route Handler 或服务端动态路由。

- 构建：`yarn build:static-dashboard`
- 产物：`static-dashboard/out`
- 本地 Pages 预览：`yarn preview:static-dashboard`
- 静态容器：`docker build -f Dockerfile.static-dashboard -t static-dashboard .`
- Cloudflare Pages：`yarn deploy:static-dashboard:pages`
- 适用：Cloudflare Pages、对象存储 CDN、Nginx 静态容器

静态应用当前包含首页、公共信息页、服务页、支持页和可静态生成的产品页。`/login`、`/panel`、`/api` 等路径由 CDN 或反向代理回源到 `frontend-server`。

## frontend-server

保留完整 Next.js Server Runtime，包括动态页面、鉴权、API Route Handler 和现有服务端集成。

### Node/VPS

- 构建：`yarn build:frontend-server:node`
- 独立容器：`docker build -f Dockerfile.frontend-server -t frontend-server .`
- 运行时：Node.js standalone

### OpenNext/Worker

- 构建：`yarn build:frontend-server:worker`
- 本地预览：`yarn preview:frontend-server:worker`
- Cloudflare Worker：`yarn deploy:frontend-server:worker`
- 配置：`open-next.config.ts` 与 `wrangler.worker.jsonc`
- 运行时：Cloudflare Worker + OpenNext

Worker 是可选适配模式，不改变 Node/VPS 默认构建。包含文件系统、子进程、持久 WebSocket 或本地状态的接口仍应优先运行在 VPS，待单独验证后再迁移。

## 默认一体化镜像

根目录 `Dockerfile` 同时构建 `static-dashboard` 与 `frontend-server`：

- Nginx 在 `8080` 端口优先提供静态页面和静态资源。
- 未命中静态产物的 `/login`、`/panel`、`/api` 和动态页面回源到同容器内的 Next.js standalone 服务。
- 构建：`docker build -t portal-all-in-one .`

## GitHub Actions 验证

`.github/workflows/validate-frontend-delivery.yml` 在 Node.js 24 上验证三个 Next.js 构建目标，并使用 Buildx 验证三个 Dockerfile。流水线只构建、不推送镜像，也不会部署 Cloudflare 资源；可通过特性分支 push、Pull Request 或手动触发运行。

## UAT Cloudflare 联动验证

`ai-workspace-infra/platform-ops-toolkit` 的 `Serverless Orchestrator` 可手动验证本分支的 Cloudflare 交付：

- `deploy_cloudflare=true|false`
- `deploy_cloud_run=true|false`
- `verify_supabase=true|false`
- `initialize_supabase=true|false`
- `portal_repository=ai-workspace-services/portal`
- `vault_env_path=sit | uat | prod`
- `portal_ref=<不可变发布 tag、portal PR head SHA 或分支名>`

该模式将 Cloudflare、GCP Cloud Run、Supabase 作为可组合节点：可全选执行完整验证，也可只选择其中任意部分。Cloudflare 节点会检出指定 portal ref，部署 `static-dashboard/out` 至同名 Pages 分支，并将 `frontend-server` 通过 OpenNext 部署为 `frontend-server-edge-sit`、`frontend-server-edge-uat` 或 `frontend-server-edge-prod` Worker；Cloud Run 节点部署后端服务并注入 Supabase 连接；Supabase 节点校验 Vault 中的连接契约，`initialize_supabase=true` 时先初始化 Accounts schema。任何已选择节点失败都会使编排失败。

## 推荐路由

| 路径 | 目标 |
| --- | --- |
| `/_next/static/*`、公共静态页面 | `static-dashboard` / CDN |
| `/login/*`、`/panel/*`、动态页面 | `frontend-server` |
| `/api/*` | `frontend-server`，默认 Node/VPS |
| 已验证为无状态且兼容 Worker 的路径 | `frontend-server` Worker |
