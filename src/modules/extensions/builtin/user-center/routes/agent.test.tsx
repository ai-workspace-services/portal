import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "root-account", isRoot: true } as {
    id: string;
    isRoot?: boolean;
    isAdmin?: boolean;
    isOperator?: boolean;
    role?: "admin" | "operator" | "user";
  },
  fetchPools: vi.fn(),
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@lib/userStore", () => ({
  useUserStore: (selector: (state: { user: typeof mocks.user }) => unknown) =>
    selector({ user: mocks.user }),
}));
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("../lib/regionalPools", () => ({
  fetchRegionalPools: mocks.fetchPools,
}));
vi.mock("../components/xds/AccountPanels", () => ({
  NodesTable: ({ pools }: { pools: Array<{ entry: string }> }) => (
    <div>
      {pools.map((p) => (
        <p key={p.entry}>{p.entry}</p>
      ))}
    </div>
  ),
}));

import ManagementPage from "@/app/panel/management/page";
import UserCenterAgentRoute from "./agent";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("drops root inventory immediately when switching to a personal account", async () => {
  mocks.user = { id: "root-account", isRoot: true };
  mocks.fetchPools
    .mockResolvedValueOnce([{ entry: "team.example.test" }])
    .mockImplementationOnce(() => new Promise(() => {}));
  const cache = new Map();
  const view = () => (
    <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
      <UserCenterAgentRoute />
    </SWRConfig>
  );
  const { rerender } = render(view());
  expect(await screen.findByText("team.example.test")).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Agent 分组与集中配置管理" }),
  ).toBeTruthy();
  mocks.user = { id: "personal-account", isRoot: false };
  rerender(view());
  expect(screen.queryByText("team.example.test")).toBeNull();
  expect(
    screen.queryByRole("region", { name: "Agent 分组与集中配置管理" }),
  ).toBeNull();
});

it("consolidates Agent grouping and centralized configuration management on /panel/agent", async () => {
  mocks.user = { id: "operator-account", isOperator: true, role: "operator" };
  mocks.fetchPools.mockResolvedValueOnce([{ entry: "shared.example.test" }]);
  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url === "/api/auth/admin/agents/inventory") {
      return {
        ok: true,
        json: async () => ({
          agents: [
            {
              id: "jp-custom-01",
              nodeId: "node-jp-custom-01",
              name: "JP Custom 01",
              resourceClass: "custom",
              status: "healthy",
            },
          ],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({ agents: [] }),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <UserCenterAgentRoute />
    </SWRConfig>,
  );

  expect(await screen.findByText("JP Custom 01")).toBeTruthy();
  expect(await screen.findByText("shared.example.test")).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Agent 分组与集中配置管理" }),
  ).toBeTruthy();
  expect(screen.getByRole("region", { name: "Team agents" })).toBeTruthy();
});

it("redirects /panel/management?tab=agents to /panel/agent", async () => {
  await expect(
    ManagementPage({ searchParams: Promise.resolve({ tab: "agents" }) }),
  ).rejects.toThrow("NEXT_REDIRECT:/panel/agent");
  expect(mocks.redirect).toHaveBeenCalledWith("/panel/agent");
});
