import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmailPreferencesForm from "./EmailPreferencesForm";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  mutate: vi.fn(),
  data: {
    productUpdates: false,
    tutorials: false,
    offers: false,
    frequency: "monthly",
    version: 0,
  },
}));
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("swr", () => ({
  default: () => ({ data: mocks.data, isLoading: false, mutate: mocks.mutate }),
}));
vi.mock("@/lib/email-preferences", async (original) => ({
  ...(await original<typeof import("@/lib/email-preferences")>()),
  emailRequest: mocks.request,
}));
beforeEach(() => {
  vi.clearAllMocks();
});
describe("self-service email preferences", () => {
  it("starts with unchecked categories and saves only explicit choices", async () => {
    mocks.request.mockResolvedValue({
      ...mocks.data,
      productUpdates: true,
      version: 1,
    });
    render(<EmailPreferencesForm token="scoped-key" />);
    expect(
      screen
        .getAllByRole("checkbox")
        .every((input) => !(input as HTMLInputElement).checked),
    ).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "新特性与产品更新" }));
    fireEvent.click(screen.getByRole("button", { name: "保存偏好" }));
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        "/api/auth/email-preferences?key=scoped-key",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    const body = JSON.parse(mocks.request.mock.calls[0][1].body);
    expect(body).toMatchObject({
      productUpdates: true,
      tutorials: false,
      offers: false,
      version: 0,
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "邮件偏好已保存",
    );
  });
  it("does not unsubscribe on page load; one explicit action submits", async () => {
    mocks.request.mockResolvedValue(undefined);
    render(<EmailPreferencesForm token="unsubscribe-key" unsubscribe />);
    expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "确认取消全部营销邮件" }),
    );
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        "/api/auth/email-unsubscribe?key=unsubscribe-key",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "已停止接收全部营销邮件",
    );
    expect(
      screen.queryByRole("button", { name: "确认取消全部营销邮件" }),
    ).toBeNull();
  });
  it("does not display a success state when persistence fails", async () => {
    mocks.request.mockRejectedValue(
      new Error("email preferences changed; reload and try again"),
    );
    render(<EmailPreferencesForm token="scoped-key" />);
    fireEvent.click(screen.getByRole("button", { name: "保存偏好" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("reload");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
