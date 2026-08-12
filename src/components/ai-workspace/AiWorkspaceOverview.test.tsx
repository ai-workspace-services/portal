import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiWorkspaceOverview } from "@/components/ai-workspace/AiWorkspaceOverview";

describe("AiWorkspaceOverview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the server-backed workbench projection", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          id: "thread-1",
          sessionKey: "thread-1",
          title: "发布总览视觉升级",
          lifecycleStatus: "running",
          updatedAtMs: Date.now(),
          workspacePath: "/workspaces/ai-workspace",
          artifactPaths: ["/artifacts/overview.png"],
          messages: [{ role: "user", text: "更新总览页面" }],
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AiWorkspaceOverview />);

    expect(await screen.findByText("发布总览视觉升级")).toBeInTheDocument();
    expect(screen.getByText("TaskThreads")).toBeInTheDocument();
    expect(screen.getByText("需要你处理")).toBeInTheDocument();
    expect(screen.getByText("正在推进的专项")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai-workspace/threads",
      expect.objectContaining({ credentials: "include" }),
    );

    const activityControls = screen.getByRole("group", { name: "活动时间范围" });
    fireEvent.click(activityControls.querySelector('button:nth-child(2)')!);
    expect(activityControls.querySelector('button:nth-child(2)')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a service error without local task fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 502 })),
    );

    render(<AiWorkspaceOverview />);

    await waitFor(() => {
      expect(screen.getByText("加载工作台数据失败：502")).toBeInTheDocument();
    });
    expect(screen.getByText("当前没有待处理事项")).toBeInTheDocument();
  });
});
