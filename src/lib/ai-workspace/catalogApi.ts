export interface PinnedTask {
  id: string;
  source: string;
  title: string;
  cwd?: string;
  projectName?: string;
  gitBranch?: string;
  position: number;
  updatedAt: string;
}

export interface SharedProject {
  id: string;
  name: string;
  rootPath: string;
  sources: string[];
  updatedAt?: string;
}

export interface ActiveClaim {
  resource: string;
  agentId: string;
  agentKind: string;
  intent?: string;
  expiresAt: string;
  threadId?: string;
}

export interface TaskCatalog {
  pinnedTasks: PinnedTask[];
  sharedProjects: SharedProject[];
  activeClaims: ActiveClaim[];
  recentThreads?: Array<{
    id: string;
    scope: string;
    headBranch?: string | null;
    title?: string;
    state: string;
    updatedAt: string;
  }>;
}

const FALLBACK_CATALOG: TaskCatalog = {
  pinnedTasks: [
    {
      id: "01a085f9-e0f7-7052-b0e5-a365be6858ef",
      source: "codex",
      title: "修正区域入口节点展示",
      cwd: "/Users/shenlan/workspaces/ai-workspace-service",
      projectName: "ai-workspace-service",
      position: 4000000,
      updatedAt: "2026-09-10T23:11:07.332Z"
    },
    {
      id: "01a07abc-4003-7830-aa07-219064296b27",
      source: "codex",
      title: "Inspect XConnect One local work",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-07/referenced-chatgpt-conversation-this-is-an-2",
      position: 6000000,
      updatedAt: "2026-09-17T02:31:13.807Z"
    },
    {
      id: "01a04281-1807-7d61-a3a4-30efcc96c562",
      source: "codex",
      title: "设计轻量级零信任 VPN",
      cwd: "/Users/shenlan/workspaces/ai-workspace-infra/iac_modules",
      projectName: "iac_modules",
      gitBranch: "codex/xconnect-productization-docs",
      position: 8000000,
      updatedAt: "2026-09-12T13:08:38.589Z"
    },
    {
      id: "01a08f10-4e38-76c0-8150-f56bbd11f086",
      source: "codex",
      title: "落地个人 AI 聚合服务 v1",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-11/referenced-chatgpt-conversation-this-is-an",
      position: 8500000,
      updatedAt: "2026-09-17T02:24:22.309Z"
    },
    {
      id: "01a085c5-6335-7dc0-81ae-142a530dfb77",
      source: "codex",
      title: "实现月度配额超额限流",
      cwd: "/Users/shenlan/workspaces/ai-workspace-service",
      projectName: "ai-workspace-service",
      position: 9000000,
      updatedAt: "2026-09-14T02:23:43.767Z"
    },
    {
      id: "01a08d7f-9030-7771-92ac-aee34fc841de",
      source: "codex",
      title: "完成 XWorkmate 事务邮件通道上线",
      cwd: "/Users/shenlan/workspaces/ai-workspace-service",
      projectName: "ai-workspace-service",
      position: 10000000,
      updatedAt: "2026-09-10T23:09:27.862Z"
    },
    {
      id: "01a0864c-7b85-78f2-ba75-b4e22afcdddb",
      source: "codex",
      title: "规划 Guance 年度合作内容",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-09/referenced-chatgpt-conversation-this-is-an-3",
      position: 11000000,
      updatedAt: "2026-09-14T23:03:01.055Z"
    },
    {
      id: "01a08456-36a8-7321-b2a4-88058e385851",
      source: "codex",
      title: "规划 XConnect 区域节点调度",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-09/referenced-chatgpt-conversation-this-is-an-2",
      position: 12000000,
      updatedAt: "2026-09-09T05:37:13.317Z"
    },
    {
      id: "01a075e3-1363-7e02-a397-dfd1df1cb1cd",
      source: "codex",
      title: "继续验证 Android 版本",
      cwd: "/Users/shenlan/workspaces/ai-workspace-xstream/xconnect-app",
      projectName: "xconnect-app",
      gitBranch: "main",
      position: 13000000,
      updatedAt: "2026-09-15T03:00:32.879Z"
    },
    {
      id: "01a08396-f87a-7b02-bdba-c085ce7f1255",
      source: "codex",
      title: "编写二维码图片嵌入脚本",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-09/manila-vps-1c2g-ipv4-10-vultr",
      position: 14000000,
      updatedAt: "2026-09-13T08:43:04.226Z"
    },
    {
      id: "01a0803b-486a-7f22-94fe-a25f8f84569f",
      source: "codex",
      title: "拆分10期配套文案为Markdown",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-08/referenced-chatgpt-conversation-this-is-an-5",
      position: 15000000,
      updatedAt: "2026-09-15T04:22:03.451Z"
    },
    {
      id: "01a0a301-d80c-79e2-a02e-69b6480703fb",
      source: "codex",
      title: "GCP 新组织对接落地计划",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-15/gcp-organization-integration",
      position: 17000000,
      updatedAt: "2026-09-16T07:25:47.248Z"
    },
    {
      id: "01a0a334-639a-7df0-82eb-33f33094e664",
      source: "codex",
      title: "落地最简 AI Desktop Ansible role",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-15/referenced-chatgpt-conversation-this-is-an",
      position: 18000000,
      updatedAt: "2026-09-16T08:15:05.287Z"
    },
    {
      id: "01a0a54b-58ac-78e0-b56c-9219074b154f",
      source: "codex",
      title: "创建 AI Workspace 架构远景文档",
      cwd: "/Users/shenlan/Documents/Codex/2026-09-15/referenced-chatgpt-conversation-this-is-an-3",
      position: 19000000,
      updatedAt: "2026-09-16T08:12:26.784Z"
    },
    {
      id: "01a0a7f0-86f2-7b71-b2d0-439327b7df96",
      source: "codex",
      title: "评估 Akamai 对接 iac_modules",
      cwd: "/Users/shenlan/.codex/worktrees/b9b6/iac_modules",
      projectName: "iac_modules",
      gitBranch: "codex/akamai-concrete-account-docs",
      position: 20000000,
      updatedAt: "2026-09-16T08:20:58.401Z"
    }
  ],
  sharedProjects: [
    {
      id: "01a05c27-c4da-71e0-9a99-7b9cba62c338",
      name: "ai-workspace-lab",
      rootPath: "/Users/shenlan/workspaces/ai-workspace-lab",
      sources: ["claude", "codex"]
    },
    {
      id: "01a05b78-8ff3-7422-bfc5-701f4189b282",
      name: "iac_modules",
      rootPath: "/Users/shenlan/workspaces/ai-workspace-infra/iac_modules",
      sources: ["codex"]
    },
    {
      id: "01a05b78-8ffb-7e82-8ccf-7aba0afcc5a2",
      name: "ai-workspace-service",
      rootPath: "/Users/shenlan/workspaces/ai-workspace-service",
      sources: ["codex"]
    },
    {
      id: "01a05b78-8fef-7aa2-a870-269c118ee29e",
      name: "ai-workspace-infra",
      rootPath: "/Users/shenlan/workspaces/ai-workspace-infra",
      sources: ["codex"]
    },
    {
      id: "claude:portal",
      name: "portal",
      rootPath: "/Users/shenlan/workspaces/ai-workspace-service/portal",
      sources: ["claude"]
    },
    {
      id: "01a05b78-8ffc-7143-9f45-dce8e137f8eb",
      name: "xconnect-app",
      rootPath: "/Users/shenlan/workspaces/ai-workspace-xstream/xconnect-app",
      sources: ["codex"]
    },
    {
      id: "01a08620-1887-7621-8eb6-3fe2c16df0ca",
      name: "AI WorkSpace",
      rootPath: "/Users/shenlan/.codex/.chatgpt-projects/g-p-6a24e4bb29f88191a62841680baabed5",
      sources: ["codex"]
    },
    {
      id: "01a0861f-b45a-78f3-a3bd-433708e90a8a",
      name: "自媒体运营",
      rootPath: "/Users/shenlan/.codex/.chatgpt-projects/g-p-6a33953e65948191b153c84512b5603e",
      sources: ["codex"]
    },
    {
      id: "01a088d7-0a39-7c21-a90b-f50ca45d4156",
      name: "自媒体",
      rootPath: "/Users/shenlan/.codex/.chatgpt-projects/g-p-697c2d794e6c8191b460475665248a97",
      sources: ["codex"]
    }
  ],
  activeClaims: []
};

export async function fetchSharedTaskCatalog(
  fetcher: typeof fetch = fetch,
): Promise<TaskCatalog> {
  try {
    const res = await fetcher("/api/ai-workspace/tasks/catalog", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      return FALLBACK_CATALOG;
    }
    const data = await res.json();
    if (data?.ok && data?.catalog) {
      return data.catalog as TaskCatalog;
    }
    return FALLBACK_CATALOG;
  } catch {
    return FALLBACK_CATALOG;
  }
}
