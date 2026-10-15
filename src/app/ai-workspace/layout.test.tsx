import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/ai-workspace" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/userStore", () => ({
  useUserStore: (select: (state: { user: null; isLoading: boolean }) => unknown) =>
    select({ user: null, isLoading: false }),
}));

import AiWorkspaceLayout from "@/app/ai-workspace/layout";
import AiWorkspacePage from "@/app/ai-workspace/page";
import AiWorkspaceBotTeamPage from "@/app/ai-workspace/bot-team/page";

describe("/ai-workspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigation.pathname = "/ai-workspace";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("action=ping")) return Response.json({ status: "ok" });
        if (url.startsWith("/api/ai-workspace/free")) {
          return Response.json({ mode: "trial", canPersist: false, canDownload: false });
        }
        if (url.startsWith("/api/ai-workspace/tasks/catalog")) {
          return Response.json({ pinnedTasks: [], sharedProjects: [] });
        }
        return Response.json({ namespaces: [], sessions: [] });
      }),
    );
  });

  it("renders the workspace with a single sidebar, not one nested in another", () => {
    render(
      <AiWorkspaceLayout>
        <AiWorkspacePage />
      </AiWorkspaceLayout>,
    );

    expect(screen.getAllByRole("complementary", { name: "任务导航" })).toHaveLength(1);
    expect(screen.getAllByText("XWorkmate")).toHaveLength(1);
    expect(screen.getByText("对话工作流")).toBeInTheDocument();
  });

  it("moves the sidebar toggle into the page toolbar while the sidebar is hidden", () => {
    render(
      <AiWorkspaceLayout>
        <AiWorkspacePage />
      </AiWorkspaceLayout>,
    );
    expect(screen.queryByTestId("sidebar-reveal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sidebar-collapse"));
    expect(screen.queryByRole("complementary", { name: "任务导航" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sidebar-reveal"));
    expect(screen.getByRole("complementary", { name: "任务导航" })).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-reveal")).not.toBeInTheDocument();
  });

  it("asks a guest to sign in before handing tasks to the Bot team", async () => {
    navigation.pathname = "/ai-workspace/bot-team";
    render(
      <AiWorkspaceLayout>
        <AiWorkspaceBotTeamPage />
      </AiWorkspaceLayout>,
    );

    expect(await screen.findByText("登录账号后使用 Bot 团队")).toBeInTheDocument();
    expect(screen.getByTestId("bot-team-submit")).toBeDisabled();
    const nav = screen.getByRole("navigation", { name: "工作区" });
    expect(within(nav).getByRole("link", { name: "Bot 团队" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
