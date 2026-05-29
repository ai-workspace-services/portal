import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { XWorkmateWorkspacePage } from "@/components/xworkmate/XWorkmateWorkspacePage";

describe("XWorkmateWorkspacePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("action=ping")) {
          return Response.json({
            status: "ok",
            version: "test-version",
          });
        }

        return Response.json({
          jsonrpc: "2.0",
          id: "test",
          result: {
            success: true,
            output: "bridge task ok",
            artifacts: [{ name: "result.pdf" }],
            remoteWorkingDirectory: "/tmp/xworkmate",
          },
        });
      }),
    );
  });

  it("renders the bridge workspace shell from the screenshot flow", async () => {
    render(<XWorkmateWorkspacePage />);

    expect(screen.getByText("XWorkmate")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索任务")).toBeInTheDocument();
    expect(screen.getByText("开始对话或运行任务")).toBeInTheDocument();
    expect(
      screen.getByText("已连接 · xworkmate-bridge.svc.plus"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Bridge: connected/)).toBeInTheDocument();
    });
  });

  it("submits a prompt through the bridge proxy and renders the result", async () => {
    render(<XWorkmateWorkspacePage />);

    fireEvent.change(screen.getByPlaceholderText(/输入需求/), {
      target: { value: "请只回复 ok" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    await waitFor(() => {
      expect(screen.getAllByText("bridge task ok").length).toBeGreaterThan(0);
      expect(screen.getByText("/tmp/xworkmate")).toBeInTheDocument();
      expect(screen.getByText("result.pdf")).toBeInTheDocument();
    });
  });
});
