import {
  Activity,
  FileClock,
  GitBranch,
  LayoutDashboard,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import type { DashboardExtension } from "../../types";
import type { AccessRule } from "@lib/accessControl";

const guard: AccessRule = {
  requireLogin: true,
  roles: ["admin", "operator"],
  permissions: ["platform.ops.read"],
};

export const platformOperationsExtension: DashboardExtension = {
  id: "builtin.platform-operations",
  meta: {
    title: "Platform Operations",
    description: "安全查看并驱动现有发布与基础设施 Workflow。",
    version: "0.1.0",
    author: "Cloud-Neutral",
    keywords: ["operations", "release", "vault", "github-actions", "xconnect"],
  },
  routes: [
    {
      id: "platformOperations",
      path: "/panel/operations",
      label: "Overview",
      description: "平台运行与操作总览",
      icon: LayoutDashboard,
      loader: () => import("./routes/overview"),
      guard,
      sidebar: { section: "management", order: 24 },
    },
    {
      id: "platformOperationsReleases",
      path: "/panel/operations/releases",
      label: "Releases",
      description: "跨仓库 Tag 与环境发布",
      icon: GitBranch,
      loader: () => import("./routes/releases"),
      guard,
      sidebar: { section: "management", order: 25 },
    },
    {
      id: "platformOperationsEnvironments",
      path: "/panel/operations/environments",
      label: "Environments",
      description: "Pages、SSR、Cloud Run 与 Hybrid",
      icon: ServerCog,
      loader: () => import("./routes/environments"),
      guard,
      sidebar: { section: "management", order: 26 },
    },
    {
      id: "platformOperationsAudit",
      path: "/panel/operations/audit",
      label: "Audit",
      description: "审批、执行与审计时间线",
      icon: FileClock,
      loader: () => import("./routes/audit"),
      guard,
      sidebar: { section: "management", order: 27 },
    },
    {
      id: "platformOperationsVault",
      path: "/panel/operations/vault-access",
      label: "Vault & Access",
      description: "角色声明、MFA 与访问边界",
      icon: ShieldCheck,
      loader: () => import("./routes/vault-access"),
      guard,
      sidebar: { section: "management", order: 28 },
    },
  ],
};
