/**
 * Shared cross-agent task catalog (pinned tasks, shared projects, active claims),
 * read through /api/ai-workspace/tasks/catalog → xworkmate-bridge → QMD.
 *
 * Locations are git scopes plus repo-relative paths, cloud project refs or
 * directory names; the catalog never carries absolute machine paths.
 */

export type LocationKind = "repo" | "chatgpt-project" | "directory";

export interface PinnedTask {
  id: string;
  source: string;
  title: string;
  scope: string | null;
  location: string | null;
  projectName?: string;
  gitBranch?: string;
  position: number;
  updatedAt: string;
  removedAt?: string | null;
}

export interface SharedProject {
  key: string;
  name: string;
  kind: LocationKind;
  scope: string | null;
  location: string;
  sources: string[];
  updatedAt?: string;
  removedAt?: string | null;
}

export interface ActiveClaim {
  scope?: string;
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
  page?: { limit: number; offset: number; pinnedTotal: number; projectsTotal: number };
}

export class CatalogUnavailableError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CatalogUnavailableError";
  }
}

/** Human-readable location: "github.com/org/repo", "github.com/org/repo/sub", or the ref. */
export function formatLocation(scope: string | null | undefined, location: string | null | undefined): string {
  if (scope) return !location || location === "." ? scope : `${scope}/${location}`;
  return location ?? "";
}

/** MCP call another agent can run to pick the task up. */
export function resumeCommand(task: Pick<PinnedTask, "scope" | "gitBranch" | "title">): string {
  if (task.scope && task.gitBranch) return `task_resume(scope="${task.scope}", branch="${task.gitBranch}")`;
  if (task.scope) return `task_catalog(cwd) → task_resume(scope="${task.scope}")`;
  return "task_catalog()";
}

/**
 * Fetch the catalog. Throws CatalogUnavailableError when it cannot be loaded, so
 * the UI shows an error instead of an empty (or stale) list.
 */
export async function fetchSharedTaskCatalog(fetcher: typeof fetch = fetch): Promise<TaskCatalog> {
  let res: Response;
  try {
    res = await fetcher("/api/ai-workspace/tasks/catalog?limit=200", { method: "GET", cache: "no-store" });
  } catch {
    throw new CatalogUnavailableError("任务目录暂时无法连接");
  }
  if (res.status === 401) throw new CatalogUnavailableError("请登录后查看跨 Agent 任务", 401);
  if (!res.ok) throw new CatalogUnavailableError("任务目录暂时不可用", res.status);
  let data: { ok?: boolean; catalog?: TaskCatalog };
  try {
    data = await res.json();
  } catch {
    throw new CatalogUnavailableError("任务目录返回了无法解析的数据", res.status);
  }
  if (!data?.ok || !data.catalog) throw new CatalogUnavailableError("任务目录返回了无效数据", res.status);
  return data.catalog;
}
