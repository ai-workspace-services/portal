import { Network } from "lucide-react";

import type { DashboardExtension } from "../../types";

export const xconnectZeroExtension: DashboardExtension = {
  id: "builtin.xconnect-zero",
  meta: {
    title: "XConnect Zero",
    description: "Zero Trust 私有网络的中心控面。",
    version: "0.1.0",
    author: "Cloud-Neutral",
    keywords: ["xconnect", "zero", "overlay", "vpn"],
  },
  routes: [
    {
      id: "xconnectZero",
      path: "/panel/xconnect-zero",
      label: "XConnect Zero",
      description: "管理 Zero 控面与私有网络",
      icon: Network,
      loader: () => import("./routes/overview"),
      guard: {
        requireLogin: true,
        roles: ["admin", "operator", "user"],
        permissions: ["xconnect.zero.read"],
      },
      redirect: { unauthenticated: "/login", forbidden: "/panel" },
      sidebar: { section: "management", order: 23 },
      featureFlag: {
        id: "builtin.xconnect-zero",
        title: "XConnect Zero 控面",
        description: "启用 XConnect Zero WebUI。",
        envVar: "NEXT_PUBLIC_FEATURE_XCONNECT_ZERO_MODULE",
        defaultEnabled: true,
      },
    },
  ],
};
