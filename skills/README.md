# Skills in this repository

**项目级标准不在这里。** 它们统一定义在
[`ai-workspace-lab/xworkspace-core-skills`](https://github.com/ai-workspace-lab/xworkspace-core-skills)，
本仓库直接引用，不再复制一份。

`skills/` 下只保留**只对 portal 成立**的规范——离开这个仓库就没有意义的那些。

## 本仓库的 skill

| Skill | 为什么只属于 portal |
|---|---|
| `ui-typography` | 字号阶梯定义在 `src/app/globals.css`，守卫脚本接入本仓库的 `yarn lint` |
| `portal-frontend-content-boundary` | 前端内容边界是 portal 的路由与构建切分方式 |
| `release-traceability` | portal 自身的发布溯源约定 |
| `git-history-secret-remediation` | 配合本仓库 `scripts/security/` 与 `scripts/hooks/` 的处置流程 |

## 项目级标准去中心仓库找

**engineering-standards**

`project-development-standard`（分支、PR、发布、打 tag）·
`ci-cd-workflow-spec`（CI/CD 与测试门禁）·
`multi-environment-delivery-and-release`（多环境交付、Vault OIDC、密钥隔离）·
`issue-pr-traceability-standard` · `config-as-code-spec` ·
`infrastructure-as-code-spec` · `ai-agent-collaboration-standard` · `harness-workflow`

**operations-management**

`incident-response-and-change-management` · `secrets-identity-and-access-governance` ·
`observability-slo-and-alerting` · `service-catalog-and-runbook-standard` ·
`github-actions-operational-dispatch` · `network-dns-tls-edge-management` ·
`backup-disaster-recovery-and-data-migration` · `capacity-cost-and-resource-lifecycle`

## 新增 skill 之前

先问：**这条规范离开 portal 还成立吗？**

成立 → 提到中心仓库，那两类标准是持续闭环优化的，不要在这里开分叉。
不成立 → 才放这里，并且必须带 frontmatter（`name` + `description`），
否则不会被加载，只会让人误以为它在生效。

本仓库曾有 14 个缺 frontmatter 的文件，其中多数在重复定义上述项目级标准，
已于 2026-09 清理。
