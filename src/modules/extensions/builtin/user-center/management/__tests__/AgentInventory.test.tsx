import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import AgentInventory from "../components/AgentInventory";

afterEach(() => vi.unstubAllGlobals());

it("filters five Accounts resource classes independently and uses the authenticated route", async () => {
  const classes = ["Free", "Shared", "Plus", "Pro", "Custom"];
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      agents: classes.map((name) => ({
        id: `${name}-fixture`,
        resourceClass: name.toLowerCase(),
        status: "healthy",
      })),
    }),
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
