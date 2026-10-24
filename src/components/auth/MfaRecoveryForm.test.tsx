import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MfaRecoveryForm from "./MfaRecoveryForm";

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

describe("MFA recovery authorization", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("requires explicit authorization and sends a request for review, not a reset", async () => {
    const fetcher = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "verification_requested" }), {
          status: 202,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "pending_review" }), {
          status: 202,
        }),
      );
    render(<MfaRecoveryForm />);
    fireEvent.change(screen.getByLabelText("Account email"), {
      target: { value: "owner@example.invalid" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Send MFA recovery verification code",
      }),
    );
    await screen.findByLabelText("Email verification code");
    fireEvent.change(screen.getByLabelText("Email verification code"), {
      target: { value: "123456" },
    });
    fireEvent.change(
      screen.getByLabelText("Application or review reason (5–1000 characters)"),
      { target: { value: "Lost my authenticator" } },
    );
    expect(
      screen.getByRole("button", { name: "Submit MFA recovery request" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Submit MFA recovery request" }),
    );
    await screen.findByText("Submitted for Root review. MFA remains active.");
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [, init] = fetcher.mock.calls[1];
    expect(JSON.parse(init!.body as string)).toEqual({
      email: "owner@example.invalid",
      code: "123456",
      reason: "Lost my authenticator",
      authorized: true,
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Submit MFA recovery request" }),
      ).not.toBeInTheDocument(),
    );
  });
});
