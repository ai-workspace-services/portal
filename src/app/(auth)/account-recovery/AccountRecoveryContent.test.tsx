// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("@components/auth/AuthLayout", () => ({
  AUTH_INPUT_CLASS: "input",
  AUTH_PRIMARY_BUTTON_CLASS: "button",
  AUTH_TEXT_LINK_CLASS: "link",
  AuthLayout: ({
    children,
    title,
    alert,
  }: {
    children: React.ReactNode;
    title: string;
    alert: { message: string } | null;
  }) => (
    <main>
      <h1>{title}</h1>
      {alert ? <p role="alert">{alert.message}</p> : null}
      {children}
    </main>
  ),
}));

vi.mock("@/components/common/BoundaryLink", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import AccountRecoveryContent from "./AccountRecoveryContent";

describe("account recovery email-code flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function requestCode(fetchMock: ReturnType<typeof vi.fn>) {
    render(<AccountRecoveryContent />);
    fireEvent.change(screen.getByLabelText("Login email"), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  }

  it("shows the generic success state and then an expired-code state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "accepted" }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "code_expired" }), {
          status: 410,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await requestCode(fetchMock);
    expect(
      await screen.findByText(/If an account matches this address/),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Six-digit code"), {
      target: { value: "012345" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "newPassword123" },
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Complete recovery" }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This code has expired. Request a new code to continue.",
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/auth/password/forgot/confirm-code",
      expect.objectContaining({
        body: JSON.stringify({
          email: "person@example.com",
          code: "012345",
          password: "newPassword123",
        }),
      }),
    );
  });

  it("shows a generic failure for other confirmation errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "accepted" }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_code" }), {
          status: 400,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await requestCode(fetchMock);
    fireEvent.change(screen.getByLabelText("Six-digit code"), {
      target: { value: "012345" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Complete recovery" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not reset your password. Check the code and try again.",
    );
  });

  it("shows the password-reset success state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "accepted" }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "password reset successful" }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await requestCode(fetchMock);
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Six-digit code"), {
      target: { value: "012345" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "newPassword123" },
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Complete recovery" }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Password reset. Sign in with your new password.",
    );
    expect(screen.getByLabelText("Six-digit code")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Complete recovery" }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("New password").closest("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("holds resending for 60 seconds and shows the destination email", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    render(<AccountRecoveryContent />);
    fireEvent.change(screen.getByLabelText("Login email"), {
      target: { value: "person@example.com" },
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Send verification code" }),
      );
    });
    expect(screen.getByText("Login email: person@example.com")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Request a new code (60s)" }),
    ).toBeDisabled();
    for (let second = 0; second < 60; second++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    const resend = screen.getByRole("button", { name: "Request a new code" });
    expect(resend).toBeEnabled();
    fireEvent.click(resend);
    expect(screen.getByLabelText("Login email")).toHaveValue(
      "person@example.com",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate in-flight requests", async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountRecoveryContent />);
    const email = screen.getByLabelText("Login email");
    fireEvent.change(email, { target: { value: "person@example.com" } });
    const form = email.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains rate limits when requesting a code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await requestCode(fetchMock);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Please try again later.",
    );
    expect(screen.getByLabelText("Login email")).toBeTruthy();
  });

  it("validates the password using the Accounts whitespace policy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await requestCode(fetchMock);
    fireEvent.change(screen.getByLabelText("Six-digit code"), {
      target: { value: "012345" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "        " },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "        " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Complete recovery" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The new password must be at least 8 characters.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains rate limits during confirmation without claiming success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 202 }))
      .mockResolvedValueOnce(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await requestCode(fetchMock);
    fireEvent.change(screen.getByLabelText("Six-digit code"), {
      target: { value: "012345" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Complete recovery" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Too many attempts. Please try again later.",
      ),
    );
    expect(screen.getByLabelText("New password")).toHaveValue("newPassword123");
    expect(
      screen.getByRole("button", { name: "Complete recovery" }),
    ).toBeEnabled();
  });
});
