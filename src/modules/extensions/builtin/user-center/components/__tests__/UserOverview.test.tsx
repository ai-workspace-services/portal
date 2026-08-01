import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import UserOverview from "../UserOverview";

const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "en" }),
}));

vi.mock("@i18n/translations", () => ({
  translations: {
    en: {
      userCenter: {
        overview: {
          uuidNote: "Your UUID identifies your account.",
          cards: {
            uuid: {
              label: "UUID",
              copy: "Copy UUID",
              copied: "Copied",
              description: "UUID description",
            },
            vless: { label: "VLESS QR", description: "VLESS description" },
            username: {
              label: "Username",
              description: "Username description",
            },
            email: { label: "Email", description: "Email description" },
            mfa: {
              label: "MFA",
              description: "MFA description",
              action: "Manage MFA",
            },
          },
          lockBanner: {
            title: "Setup",
            body: "Body",
            action: "Setup MFA",
            docs: "Docs",
            logout: "Logout",
          },
        },
        mfa: {
          state: {
            enabled: "Enabled",
            pending: "Pending",
            disabled: "Disabled",
          },
          actions: { docsUrl: "https://example.test/docs" },
        },
      },
    },
  },
}));

vi.mock("@lib/publicUserIdentity", () => ({
  hasPublicUserEmail: () => true,
}));

vi.mock("@lib/userStore", () => ({
  useUserStore: (
    selector: (state: {
      user: Record<string, unknown>;
      logout: () => Promise<void>;
    }) => unknown,
  ) =>
    selector({
      user: {
        id: "account-id",
        uuid: "11111111-1111-4111-8111-111111111111",
        username: "admin",
        email: "admin@example.test",
        mfaEnabled: true,
      },
      logout: async () => undefined,
    }),
}));

vi.mock("../VlessQrCard", () => ({
  default: ({ uuid, className }: { uuid: string; className?: string }) => (
    <section className={className} data-testid="vless-connection-card">
      <p>VLESS connection for {uuid}</p>
      <button type="button">Copy VLESS link</button>
      <button type="button">Download VLESS QR</button>
    </section>
  ),
}));

describe("UserOverview", () => {
  it("keeps identity and VLESS controls visible in the account dashboard layout", async () => {
    Object.assign(navigator, { clipboard: { writeText: clipboardWriteText } });

    render(<UserOverview hideMfaMainPrompt dashboardLayout />);

    expect(
      screen.getByLabelText("Account identity and connection"),
    ).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("admin@example.test")).toBeInTheDocument();
    expect(screen.getByTestId("vless-connection-card")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy VLESS link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download VLESS QR" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy UUID" }));

    expect(clipboardWriteText).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
