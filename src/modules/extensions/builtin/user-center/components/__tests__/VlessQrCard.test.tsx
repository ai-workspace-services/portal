import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import VlessQrCard, { type VlessQrCopy } from "../VlessQrCard";

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("qrcode", () => ({
  toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,test")),
}));

vi.mock("swr", () => ({
  default: vi.fn(() => ({
    data: [
      {
        name: "JP-XHTTP.SVC.PLUS",
        address: "jp-xhttp.svc.plus",
        port: 443,
        xhttp_port: 443,
        tcp_port: 1443,
        uri_scheme_xhttp:
          "vless://${UUID}@${DOMAIN}:443?type=xhttp&path=${PATH}#${TAG}",
        uri_scheme_tcp:
          "vless://${UUID}@${DOMAIN}:1443?type=tcp&flow=${FLOW}#${TAG}",
      },
    ],
    error: undefined,
  })),
}));

const copy: VlessQrCopy = {
  label: "VLESS QR",
  description: "Scan to import VLESS config.",
  linkLabel: "VLESS link",
  linkHelper: "Copy link helper",
  copyLink: "Copy link",
  copied: "Copied",
  downloadQr: "Download QR",
  generating: "Generating",
  error: "Failed to generate",
  missingUuid: "Missing UUID",
  qrAlt: "VLESS QR code",
};

describe("VlessQrCard", () => {
  it("keeps the XHTTP connection, copy, and QR download controls available by default", async () => {
    render(
      <VlessQrCard uuid="11111111-1111-4111-8111-111111111111" copy={copy} />,
    );

    expect(screen.getByRole("button", { name: /xhttp/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tcp/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.copyLink })).toBeEnabled();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: copy.downloadQr }),
      ).toBeEnabled();
    });
  });
});
