import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import SnapshotOperationsPage from "./SnapshotOperationsPage";
import { createSnapshotPlan } from "../lib/snapshot-plan";

const state = vi.hoisted(() => ({
  catalog: {
    data: undefined as unknown,
    error: undefined as unknown,
    isLoading: false,
    mutate: vi.fn(),
  },
}));
vi.mock("swr", () => ({ default: vi.fn(() => state.catalog) }));
vi.mock("@/app/panel/components/Breadcrumbs", () => ({ default: () => null }));

describe("SnapshotOperationsPage", () => {
  beforeEach(() => {
    state.catalog.data = undefined;
    state.catalog.error = undefined;
    state.catalog.isLoading = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => ({
        ok: true,
        json: async () => createSnapshotPlan(JSON.parse(String(init.body))),
      })),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("creates a real preview plan and clears the receipt when parameters change", async () => {
    render(<SnapshotOperationsPage />);
    fireEvent.change(screen.getByLabelText("非敏感导入配置 JSON"), {
      target: { value: '{\n  "dry_run": true\n}' },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建计划" }));
    await screen.findByText("计划已生成；尚未执行");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/operations/plans");
    const request = JSON.parse(String(init?.body));
    expect(request.mode).toBe("preview");
    expect(request.inputs.migration_config_json).toBe('{"dry_run":true}');
    expect(request.inputs).not.toHaveProperty("enable_migration");
    expect(screen.getByText(/"executable": false/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Snapshot 标签"), {
      target: { value: "daily-build-2026.10.06-r3" },
    });
    expect(screen.queryByText("计划已生成；尚未执行")).not.toBeInTheDocument();
  });

  it("disables PROD planning and restricts SIT to no data operation", () => {
    render(<SnapshotOperationsPage />);
    fireEvent.click(screen.getByRole("radio", { name: /PROD/ }));
    expect(screen.getByRole("button", { name: "创建计划" })).toBeDisabled();
    expect(
      screen.getByText("生产发布入口待接入，不能通过 Daily 派发 PROD。"),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: /SIT/ }));
    expect(screen.getByRole("radio", { name: "不执行数据操作" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "实际导入" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "创建计划" })).toBeEnabled();
  });

  it("uses mutually exclusive modes and makes actual-import intent explicit", async () => {
    render(<SnapshotOperationsPage />);
    fireEvent.click(screen.getByRole("radio", { name: "实际导入" }));
    expect(screen.getByRole("radio", { name: "导入预览" })).not.toBeChecked();
    expect(screen.getByText(/实际导入会写入目标数据库/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "创建计划" }));
    await screen.findByText("计划已生成；尚未执行");
    const request = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    const plan = createSnapshotPlan(request);
    expect(plan.inputs?.enable_migration).toBe(true);
    expect(plan.inputs?.adopt_accounts_baseline).toBe(false);
    expect(plan.inputs?.apply_accounts_schema_migration).toBe(false);
    expect(JSON.parse(plan.inputs!.migration_config_json).dry_run).toBe(false);
    expect(plan.executable).toBe(false);
  });

  it("rejects unsafe JSON and empty selected repositories inline", () => {
    render(<SnapshotOperationsPage />);
    fireEvent.change(screen.getByLabelText("非敏感导入配置 JSON"), {
      target: { value: '{"token":"secret"}' },
    });
    expect(screen.getByLabelText("非敏感导入配置 JSON")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("button", { name: "创建计划" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("非敏感导入配置 JSON"), {
      target: { value: "{}" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "不执行数据操作" }));
    fireEvent.click(screen.getByRole("radio", { name: "指定仓库" }));
    expect(screen.getByRole("button", { name: "创建计划" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "指定仓库" }), {
      target: { value: "ai-workspace-services/accounts" },
    });
    expect(screen.getByRole("button", { name: "创建计划" })).toBeEnabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("displays API failure without inventing a successful plan", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response);
    render(<SnapshotOperationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "创建计划" }));
    await screen.findByText("HTTP 403");
    expect(screen.queryByText("计划已生成；尚未执行")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "创建计划" })).toBeEnabled(),
    );
  });

  it("rejects a fake successful response and prevents duplicate requests while loading", async () => {
    let complete!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    render(<SnapshotOperationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "创建计划" }));
    expect(screen.getByRole("button", { name: "正在创建计划" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "正在创建计划" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    complete({ ok: true, json: async () => ({ success: true }) } as Response);
    await screen.findByText("invalid_plan_response");
    expect(screen.queryByText("计划已生成；尚未执行")).not.toBeInTheDocument();
  });

  it("renders actual loading, unavailable and empty release states with a real Releases link", () => {
    state.catalog.isLoading = true;
    const { rerender } = render(<SnapshotOperationsPage />);
    expect(screen.getByText("加载中")).toBeInTheDocument();
    state.catalog.isLoading = false;
    state.catalog.error = new Error("unavailable");
    rerender(<SnapshotOperationsPage />);
    expect(screen.getByText("发布记录暂不可用")).toBeInTheDocument();
    state.catalog.error = undefined;
    rerender(<SnapshotOperationsPage />);
    expect(screen.getByText("暂无可用发布记录")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看发布记录" })).toHaveAttribute(
      "href",
      "/panel/operations/releases",
    );
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });
});
