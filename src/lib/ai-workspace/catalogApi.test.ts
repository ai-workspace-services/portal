import { describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError, fetchSharedTaskCatalog, formatLocation, resumeCommand } from "./catalogApi";

const response = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

describe("catalogApi", () => {
  it("returns the catalog on success", async () => {
    const catalog = {
      pinnedTasks: [{ id: "t1", source: "codex", title: "Task", scope: "github.com/a/b", location: ".", position: 1, updatedAt: "2026-09-17T00:00:00Z" }],
      sharedProjects: [{ key: "github.com/a/b", name: "b", kind: "repo", scope: "github.com/a/b", location: ".", sources: ["codex"] }],
      activeClaims: [],
    };
    const fetcher = vi.fn().mockResolvedValue(response(200, { ok: true, catalog }));
    await expect(fetchSharedTaskCatalog(fetcher as unknown as typeof fetch)).resolves.toEqual(catalog);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/ai-workspace/tasks/catalog?limit=200");
  });

  it.each([
    ["network failure", vi.fn().mockRejectedValue(new Error("down"))],
    ["unauthorized", vi.fn().mockResolvedValue(response(401, {}))],
    ["bridge error", vi.fn().mockResolvedValue(response(502, { ok: false }))],
    ["invalid body", vi.fn().mockResolvedValue(response(200, { ok: false }))],
  ])("throws instead of returning placeholder data on %s", async (_name, fetcher) => {
    await expect(fetchSharedTaskCatalog(fetcher as unknown as typeof fetch)).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it("formats locations without absolute paths", () => {
    expect(formatLocation("github.com/a/b", ".")).toBe("github.com/a/b");
    expect(formatLocation("github.com/a/b", "packages/core")).toBe("github.com/a/b/packages/core");
    expect(formatLocation(null, "dir:ai-workspace-service")).toBe("dir:ai-workspace-service");
  });

  it("builds a resume command from scope and branch", () => {
    expect(resumeCommand({ scope: "github.com/a/b", gitBranch: "feat/x", title: "t" })).toBe(
      'task_resume(scope="github.com/a/b", branch="feat/x")',
    );
    expect(resumeCommand({ scope: null, title: "t" })).toBe("task_catalog()");
  });
});
