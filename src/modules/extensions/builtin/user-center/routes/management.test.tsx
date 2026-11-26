import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: {
    id: "admin-1",
    role: "admin" as const,
    isAdmin: true,
    isRoot: false,
    groups: ["Admin"],
    permissions: [],
  },
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

vi.mock("@lib/userStore", () => ({
  useUserStore: (selector: (state: { user: typeof mocks.user; isLoading: boolean }) => unknown) =>
    selector({ user: mocks.user, isLoading: false }),
}));

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));

vi.mock("@/components/auth/MfaRecoveryReviews", () => ({
  default: () => null,
}));

import UserCenterManagementRoute from "./management";

const sampleUsers = [
  {
    id: "user-free-1",
    email: "member@svc.plus",
    username: "Member",
    role: "user",
    groups: [],
    active: true,
    proxyAccessState: "active" as const,
  },
];

describe("UserCenterManagementRoute delete user flow", () => {
  beforeEach(() => {
    if (!globalThis.crypto?.randomUUID) {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: () => "test-request-id",
        configurable: true,
      });
    }
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute("open", "");
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
      };
    }
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("collects an audit reason in a confirmation dialog and sends DELETE ?reason=...", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/users") {
        return new Response(JSON.stringify(sampleUsers), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "/api/auth/admin/users/metrics") {
        return new Response(
          JSON.stringify({
            overview: {
              totalUsers: 1,
              activeUsers: 1,
              dailyActiveUsers: 1,
              monthlyActiveUsers: 1,
              newUsersToday: 0,
            },
            series: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/auth/admin/settings") {
        return new Response(JSON.stringify({ version: 1, matrix: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "/api/auth/admin/homepage-video") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (
        url.startsWith("/api/auth/admin/users/user-free-1?reason=") &&
        init?.method === "DELETE"
      ) {
        return new Response(
          JSON.stringify({
            message: "user archived",
            archivedAt: "2026-11-26T05:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <UserCenterManagementRoute />
      </SWRConfig>,
    );

    const deleteButton = await screen.findByRole("button", {
      name: "删除用户",
    });
    fireEvent.click(deleteButton);

    expect(
      screen.getByRole("heading", { name: "确认删除（归档）用户" }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes("/api/auth/admin/users/user-free-1") &&
          init?.method === "DELETE",
      ),
    ).toBe(false);

    const confirmButton = screen.getByRole("button", { name: "确认删除" });
    expect(confirmButton).toBeDisabled();

    const reasonInput = screen.getByLabelText("删除原因（必填，写入审计日志）");
    fireEvent.change(reasonInput, {
      target: { value: "  duplicate test account  " },
    });
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).startsWith("/api/auth/admin/users/user-free-1") &&
          init?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
      expect(String(deleteCall?.[0])).toBe(
        "/api/auth/admin/users/user-free-1?reason=duplicate%20test%20account",
      );
      const headers = deleteCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-Request-ID"]).toBeTruthy();
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "确认删除（归档）用户" }),
      ).not.toBeInTheDocument();
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("shows protected-account errors inline inside the dialog without window.alert", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/users") {
        return new Response(JSON.stringify(sampleUsers), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (
        url.startsWith("/api/auth/admin/users/user-free-1?reason=") &&
        init?.method === "DELETE"
      ) {
        return new Response(
          JSON.stringify({
            error: "user_protected",
            message: "administrator or paid accounts are protected from archive",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ overview: {}, series: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <UserCenterManagementRoute />
      </SWRConfig>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "删除用户" }));
    fireEvent.change(
      screen.getByLabelText("删除原因（必填，写入审计日志）"),
      { target: { value: "cleanup request" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "管理员账号或付费/有效订阅账号受保护，无法删除归档。",
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
