import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MfaRecoveryReviews from "./MfaRecoveryReviews";

let root = false;
const queue = vi.hoisted(() => ({
  requests: [] as Array<{
    id: string;
    email: string;
    status: string;
    reason: string;
    reviewReason: string;
    createdAt: string;
    expiresAt: string;
  }>,
}));
const swr = vi.hoisted(() =>
  vi.fn((_key: unknown, _fetcher?: unknown) => ({
    data: queue,
    mutate: vi.fn(),
    error: null,
  })),
);
vi.mock("swr", () => ({ default: swr }));
vi.mock("@lib/userStore", () => ({
  useUserStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { isRoot: root } }),
}));
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

describe("Root recovery queue", () => {
  beforeEach(() => {
    queue.requests = [];
    vi.restoreAllMocks();
  });
  it("does not fetch or display the review queue for other administrators", () => {
    root = false;
    render(<MfaRecoveryReviews />);
    expect(swr.mock.calls.at(-1)?.[0]).toBeNull();
    expect(
      screen.queryByText("MFA recovery review (Root)"),
    ).not.toBeInTheDocument();
  });
  it("shows the Root queue with the identity review requirement", () => {
    root = true;
    render(<MfaRecoveryReviews />);
    expect(screen.getByText("MFA recovery review (Root)")).toBeInTheDocument();
    expect(
      screen.getByText(/You cannot review your own request/),
    ).toBeInTheDocument();
  });
  it("binds approval to the selected request, reason and current Root factor", async () => {
    root = true;
    queue.requests = [
      {
        id: "request-one",
        email: "owner@example.invalid",
        status: "pending_review",
        reason: "Lost phone",
        reviewReason: "",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    ];
    const fetcher = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "approved" }), { status: 200 }),
      );
    render(<MfaRecoveryReviews />);
    fireEvent.click(
      screen.getByRole("button", { name: "MFA recovery review (Root)" }),
    );
    fireEvent.change(screen.getByLabelText("Review reason"), {
      target: { value: "Verified identity and consent" },
    });
    fireEvent.change(screen.getByLabelText("Current Root MFA code"), {
      target: { value: "123456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Verify and remove MFA" }),
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/auth/admin/mfa-recovery/request-one",
    );
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      decision: "approved",
      reason: "Verified identity and consent",
      code: "123456",
    });
  });
});
