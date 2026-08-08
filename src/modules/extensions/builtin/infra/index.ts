import { Activity, Database, Key, Rocket, Settings } from "lucide-react";

import type { DashboardExtension } from "../../types";

export const infraExtension: DashboardExtension = {
  id: "builtin.infra",
  meta: {
    title: "基础设施管理",
    description: "云基础设施、部署、资源与可观测性管理。",
    version: "1.0.0",
    author: "XWork Tech",
    keywords: ["infrastructure", "deployments", "resources", "observability"],
  },
  routes: [
    {
      id: "deployments",
      path: "/panel/deployments",
      label: "Deployments",
      description: "部署任务与运行状态",
      icon: Rocket,
      loader: () => import("./routes/placeholder"),
      guard: { requireLogin: true },
      sidebar: { section: "infra", order: 0 },
    },
    {
      id: "resources",
      path: "/panel/resources",
      label: "Resources",
      description: "云资源与数据库实例",
      icon: Database,
      loader: () => import("./routes/placeholder"),
      guard: { requireLogin: true },
      sidebar: { section: "infra", order: 1 },
    },
    {
      id: "apiKeys",
      path: "/panel/api-keys",
      label: "API Keys",
      description: "接口密钥与访问凭证",
      icon: Key,
      loader: () => import("./routes/placeholder"),
      guard: { requireLogin: true },
      sidebar: { section: "infra", order: 2 },
    },
    {
      id: "logs",
      path: "/panel/observability",
      label: "Observability",
      description: "监控、日志与 AI 分析",
      icon: Activity,
      loader: () => import("./routes/placeholder"),
      guard: { requireLogin: true },
      sidebar: { section: "infra", order: 3 },
    },
    {
      id: "settings",
      path: "/panel/settings",
      label: "Settings",
      description: "全局系统配置",
      icon: Settings,
      loader: () => import("./routes/placeholder"),
      guard: {
        requireLogin: true,
        roles: ["admin", "operator"],
        permissions: ["admin.settings.read"],
      },
      sidebar: { section: "preferences", order: 99 },
    },
  ],
};
