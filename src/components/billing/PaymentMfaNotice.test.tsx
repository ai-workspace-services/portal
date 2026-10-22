import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentMfaNotice from "./PaymentMfaNotice";

vi.mock("@lib/userStore", () => ({
  useUserStore: (selector: (state: unknown) => unknown) =>
    selector({
      user: { mfaEnabled: false, mfaPending: false, isReadOnly: false },
    }),
}));
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

describe("Optional payment MFA recommendation", () => {
  it("explains the risk while allowing payment and upgrades", () => {
    render(<PaymentMfaNotice />);
    expect(
      screen.getByText(/You can still purchase, pay and upgrade subscriptions/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set up MFA (recommended)" }),
    ).toHaveAttribute("href", "/panel/account?setupMfa=1");
  });
});
