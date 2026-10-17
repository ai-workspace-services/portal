import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "root-account", isRoot: true },
  fetchPools: vi.fn(),
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

import UserCenterAgentRoute from "./agent";

afterEach(() => cleanup());

it("drops root inventory immediately when switching to a personal account", async () => {
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
  mocks.user = { id: "personal-account", isRoot: false };
  rerender(view());
  expect(screen.queryByText("team.example.test")).toBeNull();
});
