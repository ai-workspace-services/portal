import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import AgentInventory from "../components/AgentInventory";

afterEach(() => vi.unstubAllGlobals());

it("filters five Accounts resource classes independently and uses the authenticated route", async () => {
  const classes = ["Free", "Shared", "Plus", "Pro", "Custom"];
  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes("/agents/inventory")) {
      return {
        ok: true,
        json: async () => ({
          agents: classes.map((name) => ({
            id: `${name}-fixture`,
            resourceClass: name.toLowerCase(),
            status: "healthy",
          })),
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
    <SWRConfig value={{ provider: () => new Map() }}>
      <AgentInventory accountId="operator" language="en" />
    </SWRConfig>,
  );
  const table = await screen.findByRole("table");
  expect(within(table).getAllByRole("rowheader")).toHaveLength(5);
  for (const name of classes) {
    fireEvent.click(screen.getByRole("button", { name }));
    const nodes = within(table).getAllByRole("rowheader");
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toHaveTextContent(`${name}-fixture`);
  }
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/auth/admin/agents/inventory",
    expect.objectContaining({ cache: "no-store", credentials: "include" }),
  );
});

it("supports 5+1 classes including Team enrollments and inspects client count", async () => {
  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes("/agents/inventory")) {
      return {
        ok: true,
        json: async () => ({
          agents: [
            {
              id: "jp-custom-01",
              nodeId: "node-custom-01",
              name: "Custom Tokyo 01",
              resourceClass: "custom",
              status: "healthy",
              clientCount: 42,
              lastHeartbeat: "2026-11-07T08:00:00Z",
              lastSync: "2026-11-07T08:00:00Z",
            },
            {
              id: "hk-free-01",
              name: "Free HK 01",
              resourceClass: "free",
              status: "healthy",
              clients: 15,
            },
          ],
        }),
      };
    }
    if (url.includes("/agents/team-enrollments")) {
      return {
        ok: true,
        json: async () => ({
          agents: [
            {
              agentId: "team-sg-01",
              entryPoint: "sg-team.svc.plus",
              online: true,
              status: "approved",
              lastHeartbeat: "2026-11-07T08:05:00Z",
              updatedAt: "2026-11-07T08:05:00Z",
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
              nodeId: "node-custom-01",
              email: "beta@example.com",
              status: "active",
              state: "active",
              expiresAt: "2026-11-14T00:00:00Z",
              createdAt: "2026-11-07T00:00:00Z",
              reason: "Free trial",
            },
          ],
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fetchMock);

  const onSelectTeam = vi.fn();
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AgentInventory
        accountId="admin"
        language="zh"
        canManage={true}
        onSelectTeamAgent={onSelectTeam}
      />
    </SWRConfig>,
  );

  const table = await screen.findByRole("table");
  expect(within(table).getAllByRole("rowheader")).toHaveLength(3);
  expect(screen.getByText("42")).toBeTruthy();
  expect(screen.getByText("15")).toBeTruthy();

  // Test Team class filter
  fireEvent.click(screen.getByRole("button", { name: "Team" }));
  expect(within(table).getAllByRole("rowheader")).toHaveLength(1);
  expect(screen.getByText("team-sg-01 (sg-team.svc.plus)")).toBeTruthy();

  // Test Custom class filter & opening grants modal
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  expect(within(table).getAllByRole("rowheader")).toHaveLength(1);

  // Click row action for grants modal
  const grantBtn = screen.getByRole("button", { name: "临时白名单" });
  fireEvent.click(grantBtn);

  // Modal appears
  expect(
    await screen.findByRole("dialog", {
      name: "Custom 节点临时 Free 白名单管理",
    }),
  ).toBeTruthy();
  expect(await screen.findByText("beta@example.com")).toBeTruthy();
  expect(screen.getByText("Free trial")).toBeTruthy();
});
