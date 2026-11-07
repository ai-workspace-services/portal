import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

it("denies access to ordinary users on /panel/agent", () => {
  mocks.user = { id: "regular-user", role: "user" };
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <UserCenterAgentRoute />
    </SWRConfig>,
  );
  expect(screen.getByText("权限不足")).toBeTruthy();
  expect(
    screen.queryByRole("region", { name: "Agent 分组与集中配置管理" }),
  ).toBeNull();
});

it("enables centralized Free grant management for administrators", async () => {
  mocks.user = { id: "admin-account", isAdmin: true, role: "admin" };
  mocks.fetchPools.mockResolvedValueOnce([]);
  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes("/agents/inventory")) {
      return {
        ok: true,
        json: async () => ({
          agents: [
            {
              id: "custom-jp-node",
              name: "Custom JP Node",
              resourceClass: "custom",
              status: "healthy",
            },
          ],
        }),
      };
    }
    if (url.includes("/agents/grants")) {
      return {
        ok: true,
        json: async () => ({
          grants: [
            {
              nodeId: "custom-jp-node",
              email: "member@example.com",
              status: "active",
              state: "active",
              expiresAt: "2026-11-14T00:00:00Z",
              createdAt: "2026-11-07T00:00:00Z",
              reason: "Approved partnership",
            },
          ],
        }),
      };
    }
    return { ok: true, json: async () => ({ agents: [] }) };
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <UserCenterAgentRoute />
    </SWRConfig>,
  );

  expect(await screen.findByText("Custom JP Node")).toBeTruthy();

  // Open modal via top toolbar button
  const manageBtn = screen.getByRole("button", {
    name: "临时 Free 白名单管理",
  });
  fireEvent.click(manageBtn);

  expect(
    await screen.findByRole("dialog", {
      name: "Custom 节点临时 Free 白名单管理",
    }),
  ).toBeTruthy();
  expect(await screen.findByText("member@example.com")).toBeTruthy();
  expect(screen.getByRole("button", { name: "确认发放" })).toBeTruthy();
});
