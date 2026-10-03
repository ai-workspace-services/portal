import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NodesTable } from "../xds/AccountPanels";
import type { RegionalPool } from "../../lib/regionalPools";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/common/BoundaryLink", () => ({
  default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));
const pool: RegionalPool = {
  key: "de-fra:custom.entry.example",
  code: "de-fra",
  shortCode: "DE",
  zhName: "德国",
  enName: "Germany",
  entry: "custom.entry.example",
  poolCount: 3,
  openToUsers: false,
};

describe("NodesTable", () => {
  it("renders registered entries, pool counts and reported availability", () => {
    render(<NodesTable zh pools={[pool]} />);
    expect(screen.getByText("德国")).toBeInTheDocument();
    expect(screen.getByText("custom.entry.example")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("未开放")).toBeInTheDocument();
    expect(screen.queryByText("jp-xconnect.svc.plus")).not.toBeInTheDocument();
  });
  it("renders an empty registered list without default regions", () => {
    render(<NodesTable zh pools={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "暂无已注册的区域入口",
    );
    expect(screen.getByText("显示 0 个区域 pool")).toBeInTheDocument();
  });
  it("distinguishes errors from empty data", () => {
    render(<NodesTable zh pools={[]} error={new Error("503")} />);
    expect(screen.getByRole("alert")).toHaveTextContent("区域入口加载失败");
    expect(screen.queryByText("暂无已注册的区域入口")).not.toBeInTheDocument();
  });
});
