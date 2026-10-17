import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/xworkmate",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/userStore", () => ({
  useUserStore: (select: (state: { user: null; isLoading: boolean }) => unknown) =>
    select({ user: null, isLoading: false }),
}));

import { WorkspaceShellProvider } from "@/components/ai-workspace/shell/WorkspaceShellContext";
import { XWorkmateWorkspacePage } from "@/components/xworkmate/XWorkmateWorkspacePage";

type Handler = (url: string, init?: RequestInit) => Response | undefined;

function stubFetch(handler: Handler = () => undefined) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const handled = handler(url, init);
    if (handled) return handled;
    if (url.includes("action=ping")) {
      return Response.json({ status: "ok", version: "test-version" });
    }
    if (url.startsWith("/api/ai-workspace/tasks/catalog")) {
      return Response.json({ pinnedTasks: [], sharedProjects: [] });
    }
    if (url.endsWith("/api/ai-workspace/sessions/namespaces")) {
      return Response.json({ namespaces: [{ namespaceId: "ns-1" }] });
    }
    if (url.endsWith("/namespaces/ns-1/sessions") && init?.method === "POST") {
      return Response.json({ sessionId: "s-1", namespaceId: "ns-1", lastEventSeq: 0 });
    }
    if (url.endsWith("/namespaces/ns-1/sessions")) {
      return Response.json({ sessions: [] });
    }
    if (url.endsWith("/s-1/messages")) {
      return Response.json({
        sessionId: "s-1",
        namespaceId: "ns-1",
        snapshotVersion: 1,
        event: { seq: 1, type: "message.created", payload: {}, createdAt: "" },
        taskRun: { id: "run-1", state: "queued" },
      });
    }
    if (url.includes("/s-1/events")) {
      return Response.json({
        events: [
          {
            seq: 2,
            type: "run.progressed",
            payload: {
              taskRunId: "run-1",
              phase: "selected",
              roleSelection: { role: "Worker", executor: "codex", modelId: "m-1" },
            },
            createdAt: "",
          },
          { seq: 3, type: "assistant.message.created", payload: { taskRunId: "run-1", text: "worker answer" }, createdAt: "" },
          { seq: 4, type: "run.completed", payload: { taskRunId: "run-1" }, createdAt: "" },
        ],
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
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function chooseRole(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByTestId("role-button"));
  await user.click(await screen.findByTestId(`role-option-${label}`));
}

describe("XWorkmateWorkspacePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the App home layout with one sidebar", async () => {
    stubFetch();
    render(<XWorkmateWorkspacePage />);

    expect(screen.getAllByRole("complementary", { name: "任务导航" })).toHaveLength(1);
    const sidebar = screen.getByRole("complementary", { name: "任务导航" });
    const nav = within(sidebar).getByRole("navigation", { name: "工作区" });
    for (const label of ["工作台", "新对话", "Bot 团队"]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(sidebar).getByPlaceholderText("搜索任务")).toBeInTheDocument();
    expect(screen.getByText("对话工作流")).toBeInTheDocument();
    expect(screen.getByText("开始对话或运行任务")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /立即执行/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Bridge 已连接")).toBeInTheDocument();
      expect(screen.getByText(/Bridge: connected/)).toBeInTheDocument();
    });
  });

  it("renders only its panes inside an existing workspace shell", () => {
    stubFetch();
    render(
      <WorkspaceShellProvider homeHref="/ai-workspace">
        <XWorkmateWorkspacePage trialMode />
      </WorkspaceShellProvider>,
    );

    expect(screen.queryByRole("complementary", { name: "任务导航" })).not.toBeInTheDocument();
    expect(screen.getByText("对话工作流")).toBeInTheDocument();
  });

  it("asks to connect the Bridge when the ping fails", async () => {
    stubFetch((url) =>
      url.includes("action=ping") ? new Response("down", { status: 500 }) : undefined,
    );
    render(<XWorkmateWorkspacePage />);

    expect(await screen.findByText("先连接 Bridge")).toBeInTheDocument();
    expect(screen.getByText("Bridge ping failed: 500")).toBeInTheDocument();
    expect(screen.getByText("Bridge 未连接")).toBeInTheDocument();
  });

  it("runs a Chat turn through the bridge and renders the result", async () => {
    const fetchMock = stubFetch();
    render(<XWorkmateWorkspacePage />);

    fireEvent.change(screen.getByPlaceholderText(/输入需求/), {
      target: { value: "请只回复 ok" },
    });
    fireEvent.click(screen.getByRole("button", { name: /立即执行/ }));

    await waitFor(() => {
      expect(screen.getAllByText("bridge task ok").length).toBeGreaterThan(0);
      expect(screen.getByText("/tmp/xworkmate")).toBeInTheDocument();
      expect(screen.getByText("result.pdf")).toBeInTheDocument();
    });
    // The user's turn is in the conversation and titles the sidebar task.
    expect(screen.getAllByText("请只回复 ok").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("hand-off-button")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith("/messages")),
    ).toBe(false);
  });

  it("runs a Worker turn on the Bot team and brings the answer back", async () => {
    const fetchMock = stubFetch();
    render(<XWorkmateWorkspacePage />);
    await chooseRole("worker");

    fireEvent.change(screen.getByPlaceholderText(/输入需求/), {
      target: { value: "整理本周进展" },
    });
    fireEvent.click(screen.getByRole("button", { name: /立即执行/ }));

    expect((await screen.findAllByText("worker answer")).length).toBeGreaterThan(0);
    expect(screen.getByText("Worker · codex · m-1")).toBeInTheDocument();
    const messageCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/s-1/messages"),
    );
    expect(JSON.parse(String(messageCall?.[1]?.body))).toMatchObject({
      text: "整理本周进展",
      routing: { roleMode: "auto", role: "worker" },
    });
  });

  it("hands a task off to the Bot team without waiting for it", async () => {
    const fetchMock = stubFetch();
    render(<XWorkmateWorkspacePage />);
    await chooseRole("researcher");

    fireEvent.change(screen.getByPlaceholderText(/输入需求/), {
      target: { value: "调研竞品" },
    });
    fireEvent.click(screen.getByTestId("hand-off-button"));

    expect(
      await screen.findByText("已交给 Bot 团队（Researcher），任务会在后台执行。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看进度" })).toHaveAttribute(
      "href",
      "/ai-workspace/conversation/s-1",
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("/s-1/events")),
    ).toBe(false);
  });

  it("keeps the Bot roles locked for a guest", async () => {
    stubFetch((url) =>
      url === "/api/ai-workspace/free"
        ? Response.json({
            mode: "trial",
            canPersist: false,
            canDownload: false,
            trial: { limit: 5, used: 0, remaining: 5 },
          })
        : undefined,
    );
    render(<XWorkmateWorkspacePage trialMode />);
    expect(await screen.findByText(/访客试用 · 剩余 5/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("role-button"));
    expect(await screen.findByTestId("role-option-worker")).toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByTestId("role-option-chat")).not.toHaveAttribute("data-disabled");
  });
});
