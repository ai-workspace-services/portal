import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GatewayRoutingPolicyCard from "../GatewayRoutingPolicyCard";

describe("GatewayRoutingPolicyCard", () => {
  it("renders three-tier proxy-groups preview and media protection badge", () => {
    render(<GatewayRoutingPolicyCard zh />);

    expect(screen.getByText("GitOps 路由策略同步")).toBeInTheDocument();
    expect(screen.getByText("策略校验通过")).toBeInTheDocument();
    expect(screen.getByText("Media-Pool")).toBeInTheDocument();
    expect(screen.getByText("Pro-EC2-Pool")).toBeInTheDocument();
    expect(screen.getAllByText("media: allow").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/MATCH,Media-Pool/).length).toBeGreaterThanOrEqual(2);
  });

  it("switches between YAML and JSON and flags invalid edits", () => {
    render(<GatewayRoutingPolicyCard zh />);

    fireEvent.click(screen.getByRole("button", { name: "json" }));
    const editor = screen.getByLabelText(
      "路由策略 YAML/JSON 编辑器",
    ) as HTMLTextAreaElement;
    expect(editor.value.trim().startsWith("{")).toBe(true);

    fireEvent.change(editor, { target: { value: "{invalid json" } });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "同步至 GitOps 仓库" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "重置规范模板" }));
    expect(
      screen.getByRole("button", { name: "同步至 GitOps 仓库" }),
    ).toBeEnabled();
  });

  it("submits policy sync to the configured GitOps target", async () => {
    const onSyncPolicy = vi.fn(async () => ({
      synced: true,
      mode: "github_commit" as const,
      target: {
        repository: "ai-workspace-infra/gitops",
        branch: "main",
        path: "topology/xconnect/routing-policy.yaml",
        commitMessage: "chore(xconnect): sync three-tier routing policy from portal",
      },
      commitSha: "abc1234",
      message: "已同步至 GitOps 仓库",
      validation: {
        valid: true,
        errors: [],
        warnings: [],
        proxyGroups: [],
        rules: [],
        normalizedYaml: "",
        normalizedJson: "",
        clashProjectionYaml: "",
      },
    }));

    render(<GatewayRoutingPolicyCard zh onSyncPolicy={onSyncPolicy} />);

    fireEvent.click(screen.getByRole("button", { name: "同步至 GitOps 仓库" }));

    await waitFor(() =>
      expect(onSyncPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: "ai-workspace-infra/gitops",
          branch: "main",
          path: "topology/xconnect/routing-policy.yaml",
          dryRun: false,
        }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "已同步至 GitOps 仓库",
    );
    expect(screen.getByRole("status")).toHaveTextContent("sha=abc1234");
  });
});
