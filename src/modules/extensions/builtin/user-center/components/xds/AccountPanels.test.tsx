import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VlessConnectionCard } from "./AccountPanels";

const { toDataURLMock } = vi.hoisted(() => ({
  toDataURLMock: vi.fn(() => Promise.resolve("data:image/png;base64,test")),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("qrcode", () => ({
  toDataURL: toDataURLMock,
}));

describe("VlessConnectionCard", () => {
  it("builds the subscription with the matching lowercase regional entry", async () => {
    render(
      <VlessConnectionCard
        proxyUuid="11111111-1111-4111-8111-111111111111"
        nodes={[
          {
            name: "US-XHTTP",
            address: "runtime-us.internal",
            port: 443,
            transport: "xhttp",
            uri_scheme_xhttp:
              "vless://${UUID}@${DOMAIN}:443?type=xhttp&sni=${SNI}#${TAG}",
          },
        ]}
        zh
      />,
    );

    expect(screen.getByText("VLESS 连接")).toBeInTheDocument();
    await waitFor(() => {
      expect(toDataURLMock).toHaveBeenCalledWith(
        expect.stringContaining("@us-xconnect.svc.plus"),
        expect.any(Object),
      );
    });
  });
});
