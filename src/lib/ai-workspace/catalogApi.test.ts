import { describe, expect, it, vi } from "vitest";
import { fetchSharedTaskCatalog } from "./catalogApi";

describe("catalogApi", () => {
  it("returns fallback catalog when fetcher fails", async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new Error("Network down"));
    const catalog = await fetchSharedTaskCatalog(mockFetcher as unknown as typeof fetch);

    expect(catalog).toBeDefined();
    expect(catalog.pinnedTasks.length).toBeGreaterThan(0);
    expect(catalog.sharedProjects.length).toBeGreaterThan(0);
    expect(catalog.pinnedTasks[0].title).toBe("修正区域入口节点展示");
  });

  it("returns parsed catalog when fetcher succeeds", async () => {
    const mockCatalog = {
      pinnedTasks: [{ id: "task-1", source: "codex", title: "Custom Task", position: 1, updatedAt: "2026-09-17T00:00:00Z" }],
      sharedProjects: [{ id: "proj-1", name: "Custom Proj", rootPath: "/path", sources: ["codex"] }],
      activeClaims: [],
    };
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, catalog: mockCatalog }),
    });
    const catalog = await fetchSharedTaskCatalog(mockFetcher as unknown as typeof fetch);

    expect(catalog.pinnedTasks).toHaveLength(1);
    expect(catalog.pinnedTasks[0].title).toBe("Custom Task");
    expect(catalog.sharedProjects).toHaveLength(1);
    expect(catalog.sharedProjects[0].name).toBe("Custom Proj");
  });
});
