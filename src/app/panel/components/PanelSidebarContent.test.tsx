import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PanelSidebarContent } from "./PanelSidebarContent";

const state = vi.hoisted(() => ({
  language: "zh",
  pathname: "/panel/operations/releases",
  user: null as null | {
    role: string;
    groups: string[];
    permissions: string[];
  },
}));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: state.language }),
}));
vi.mock("@lib/userStore", () => ({
  useUserStore: (selector: (value: unknown) => unknown) =>
    selector({ user: state.user }),
}));

afterEach(() => {
  cleanup();
  state.user = null;
  state.language = "zh";
});

describe("Operations sidebar", () => {
  it.each(["admin", "operator"])(
    "shows an explicit Operations group to %s",
    (role) => {
      state.user = { role, groups: [], permissions: [] };
      render(<PanelSidebarContent />);
      expect(screen.getByText("平台运维")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "操作中心" })).toHaveAttribute(
        "href",
        "/panel/operations",
      );
      expect(screen.getByRole("link", { name: "发布记录" })).toHaveAttribute(
        "href",
        "/panel/operations/releases",
      );
      expect(screen.getByRole("link", { name: "操作中心" })).not.toHaveClass(
        "xds-is-active",
      );
      expect(screen.getByRole("link", { name: "发布记录" })).toHaveClass(
        "xds-is-active",
      );
    },
  );
  it("keeps Operations hidden from ordinary accounts and guests", () => {
    state.user = { role: "user", groups: [], permissions: [] };
    const view = render(<PanelSidebarContent />);
    expect(screen.queryByText("平台运维")).not.toBeInTheDocument();
    state.user = null;
    view.rerender(<PanelSidebarContent />);
    expect(
      screen.queryByRole("link", { name: "操作中心" }),
    ).not.toBeInTheDocument();
  });
  it("uses canonical English navigation copy", () => {
    state.user = { role: "operator", groups: [], permissions: [] };
    state.language = "en";
    render(<PanelSidebarContent />);
    expect(screen.getByText("Platform Operations")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Operations" })).toHaveAttribute(
      "href",
      "/panel/operations",
    );
  });
  it.each(["Admin", "administrator", "root"])(
    "recognizes administrator group %s even with user base role",
    (group) => {
      state.user = { role: "user", groups: [group], permissions: [] };
      render(<PanelSidebarContent />);
      expect(
        screen.getByRole("link", { name: "操作中心" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "发布记录" }),
      ).toBeInTheDocument();
    },
  );
});
