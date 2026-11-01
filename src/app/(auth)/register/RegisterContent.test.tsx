import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => navigation.params,
}));
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("@/components/common/BoundaryLink", () => ({
  default: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@components/auth/AuthLayout", () => ({
  AuthLayout: ({
    children,
    alert,
    description,
  }: {
    children: ReactNode;
    alert?: { message: string };
    description?: string;
  }) => (
    <div>
      {description && <p>{description}</p>}
      {alert && <div role="alert">{alert.message}</div>}
      {children}
    </div>
  ),
  AUTH_CHECKBOX_CLASS: "",
  AUTH_CODE_INPUT_CLASS: "",
  AUTH_HINT_PANEL_CLASS: "",
  AUTH_INPUT_CLASS: "",
  AUTH_PRIMARY_BUTTON_CLASS: "",
  AUTH_TEXT_LINK_CLASS: "",
}));
import RegisterContent from "./RegisterContent";

function fillForm() {
  for (const [id, value] of Object.entries({
    username: "NewUser",
    email: "new@example.com",
    password: "testpass123",
    "confirm-password": "testpass123",
  })) {
    fireEvent.change(document.getElementById(id)!, { target: { value } });
  }
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("open registration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigation.push.mockReset();
    navigation.refresh.mockReset();
  });
  it.each([
    { success: true },
    { token: "test-session", user: { active: true } },
  ])(
    "hides email code and accepts the successful login response %s",
    async (loginResult) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (input) => {
          if (String(input).endsWith("registration-policy"))
            return new Response(
              JSON.stringify({
                mode: "open",
                emailVerificationRequired: false,
              }),
            );
          if (String(input).endsWith("/login"))
            return new Response(JSON.stringify(loginResult));
          return new Response(JSON.stringify({ success: true }));
        });
      render(
        <RegisterContent accountServiceBaseUrl="https://accounts.example" />,
      );
      const submit = await screen.findByRole("button", { name: "完成注册" });
      await waitFor(() => expect(submit).toBeEnabled());
      expect(
        screen.queryByText(/先提交邮箱和密码获取验证码/),
      ).not.toBeInTheDocument();
      fillForm();
      fireEvent.click(submit);
      await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/"));
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
        "/api/auth/registration-policy",
        "/api/auth/register",
        "/api/auth/login",
      ]);
      expect(
        document.querySelector('input[autocomplete="one-time-code"]'),
      ).toBeNull();
      expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string).code).toBe(
        "",
      );
    },
  );
  it("retains the email-mode instructions only when verification is required", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ mode: "email", emailVerificationRequired: true }),
      ),
    );
    render(
      <RegisterContent accountServiceBaseUrl="https://accounts.example" />,
    );
    const next = await screen.findByRole("button", { name: /下一步/ });
    expect(next).toBeEnabled();
    expect(screen.getByText(/先提交邮箱和密码获取验证码/)).toBeInTheDocument();
  });
  it("shows duplicate email and does not attempt login", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) =>
        String(input).endsWith("registration-policy")
          ? new Response(
              JSON.stringify({
                mode: "open",
                emailVerificationRequired: false,
              }),
            )
          : new Response(JSON.stringify({ error: "email_already_exists" }), {
              status: 409,
            }),
      );
    render(
      <RegisterContent accountServiceBaseUrl="https://accounts.example" />,
    );
    const submit = await screen.findByRole("button", { name: "完成注册" });
    await waitFor(() => expect(submit).toBeEnabled());
    fillForm();
    fireEvent.click(submit);
    expect(
      await screen.findByText("该邮箱已注册，请直接登录或找回密码。"),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls).toHaveLength(2);
    expect(navigation.push).not.toHaveBeenCalled();
    expect(submit).toBeEnabled();
  });
  it("keeps registration disabled if policy is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 503 }),
    );
    render(
      <RegisterContent accountServiceBaseUrl="https://accounts.example" />,
    );
    expect(
      await screen.findByText("注册服务暂不可用，请稍后重试。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "完成注册" })).toBeDisabled();
  });
});
