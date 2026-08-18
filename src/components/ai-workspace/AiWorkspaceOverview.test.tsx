import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiWorkspaceOverview } from "./AiWorkspaceOverview";

describe("AiWorkspaceOverview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/namespaces")) {
          return Response.json({ namespaces: [{ id: "account" }] });
        }
        return Response.json({
          sessions: [
            {
              sessionId: "session-1",
              namespaceId: "account",
              title: "全渠道增长专项执行计划",
              lifecycleState: "running",
              updatedAt: "2026-08-12T10:21:00Z",
              model: "Opus 4.8",
              inputTokens: 1400000,
              outputTokens: 12200000,
              messageCount: 128,
              artifactCount: 12,
              projectLabel: "增长专项",
            },
          ],
        });
      }),
    );
  });

  it("renders server-backed overview and switches to model analysis", async () => {
    render(<AiWorkspaceOverview />);

    expect(screen.getByRole("tab", { name: "数据总览" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => {
      expect(screen.getByText("全渠道增长专项执行计划")).toBeInTheDocument();
    });
    expect(screen.getByText("最近 TaskThreads")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "模型分析" }));
    expect(screen.getByText("Tokens 使用趋势（按月）")).toBeInTheDocument();
    expect(screen.getByText("模型使用份额（全部）")).toBeInTheDocument();
  });

  it("keeps the five workbench destinations in one tab row", () => {
    render(<AiWorkspaceOverview />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "数据总览",
      "模型分析",
      "我的待办",
      "项目 / 专项",
      "收件箱",
    ]);
  });
});
