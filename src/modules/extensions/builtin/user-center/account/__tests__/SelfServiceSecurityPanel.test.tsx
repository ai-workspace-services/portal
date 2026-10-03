// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: {
    email: "member@example.invalid",
    mfaEnabled: true,
    groups: [],
    isAdmin: false,
  },
  refresh: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("@lib/userStore", () => ({
  useUserStore: (selector: (state: unknown) => unknown) =>
    selector({
      user: mocks.user,
      refresh: mocks.refresh,
      logout: mocks.logout,
    }),
}));

import SelfServiceSecurityPanel from "../SelfServiceSecurityPanel";

describe("SelfServiceSecurityPanel MFA recovery codes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.refresh.mockReset();
    mocks.logout.mockReset();
  });

  it("requires current MFA and displays generated recovery codes only in the live page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ activeCount: 0, expiresAt: null }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            recoveryCodes: [
              "ABCDE-FGHIJ-KLMNO-PQRST",
              "UVWXY-ABCDE-FGHIJ-KLMNO",
            ],
            expiresAt: "2027-09-27T00:00:00Z",
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<SelfServiceSecurityPanel />);

    fireEvent.change(screen.getByLabelText("管理恢复码的当前 MFA 验证码"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成/更换恢复码" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ code: "123456" });
    expect(await screen.findByText("ABCDE-FGHIJ-KLMNO-PQRST")).toBeTruthy();
    expect(screen.getByText("UVWXY-ABCDE-FGHIJ-KLMNO")).toBeTruthy();
    expect(screen.getByText(/新恢复码只显示这一次/)).toBeTruthy();
  });
});
