import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IntegrationsConsole } from "../IntegrationsConsole";

describe("IntegrationsConsole (/panel/connector)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/connectors" && (!init?.method || init.method === "GET")) {
          return new Response(
            JSON.stringify({
              github: { status: "connected", account: "octocat" },
              "google-drive": {
                status: "available",
                oauthConfigured: true,
                spreadsheetUrl:
                  "https://docs.google.com/spreadsheets/d/1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I/edit?gid=1136257492#gid=1136257492",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url === "/api/connectors" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              connector: {
                id: "custom-mcp-cmdb",
                status: "connected",
                endpoint: "https://mcp.svc.plus",
                isCustom: true,
                customMeta: {
                  name: "CMDB MCP",
                  description: "Internal CMDB MCP",
                  category: "mcp",
                  categoryLabel: "自定义 MCP",
                  authKinds: ["webhook-mcp", "api-token"],
                  preferredAuth: "webhook-mcp",
                },
              },
              message: "已添加自定义 MCP 连接器。",
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders category filters, connected summary, and Google Drive connector card", async () => {
    render(<IntegrationsConsole />);

    expect(await screen.findByText("已连接 1 个")).toBeInTheDocument();
    expect(screen.getByText("打开配置文件")).toBeInTheDocument();
    expect(screen.getByText("Google Drive")).toBeInTheDocument();
    expect(screen.getByText("AWS Lightsail")).toBeInTheDocument();
    expect(screen.getByText("Linode VPS")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "办公协作" }));
    expect(screen.getByText("Google Drive")).toBeInTheDocument();
    expect(screen.getByText("Google Workspaces")).toBeInTheDocument();
    expect(screen.queryByText("Vault Server")).toBeNull();
  });

  it("opens Google Drive drawer with Google OAuth2 primary flow and bound sheet URL", async () => {
    render(<IntegrationsConsole />);
    const driveTitle = await screen.findByText("Google Drive");
    fireEvent.click(driveTitle);

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Google OAuth2 安全授权",
    );
    const sheetInput = screen.getByLabelText(
      "Google Sheets URL",
    ) as HTMLInputElement;
    expect(sheetInput.value).toContain(
      "1V4u9b6MFIJgVuVAb056jidZLSFMiyhJJj9eDSGud1_I",
    );
    expect(screen.getByText("继续 Google OAuth2 授权")).toBeInTheDocument();
  });

  it("launches popup Web Google OAuth2 flow and refreshes user connector state", async () => {
    let authorized = false;
    const popupState = {
      closed: false,
      document: { title: "", body: { innerHTML: "" } },
      location: { href: "about:blank" },
      focus: vi.fn(),
      close: vi.fn(() => {
        popupState.closed = true;
      }),
    };
    const mockPopup = popupState as unknown as Window;
    vi.stubGlobal("open", vi.fn(() => mockPopup));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/connectors" && (!init?.method || init.method === "GET")) {
          return new Response(
            JSON.stringify({
              "google-drive": authorized
                ? {
                    status: "connected",
                    account: "bob@gmail.com",
                    writable: true,
                    oauthConfigured: true,
                  }
                : {
                    status: "available",
                    oauthConfigured: true,
                  },
            }),
            { status: 200 },
          );
        }
        if (url === "/api/connectors/google-drive/authorize") {
          return new Response(
            JSON.stringify({
              authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=xyz",
              mode: "popup",
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }),
    );

    render(<IntegrationsConsole />);
    fireEvent.click(await screen.findByText("Google Drive"));
    fireEvent.click(await screen.findByText("继续 Google OAuth2 授权"));

    await waitFor(() =>
      expect(mockPopup.location.href).toBe(
        "https://accounts.google.com/o/oauth2/v2/auth?state=xyz",
      ),
    );

    authorized = true;
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "connector-oauth-complete",
          connectorId: "google-drive",
          ok: true,
          account: "bob@gmail.com",
        },
      }),
    );

    expect(
      await screen.findByText(/已绑定当前账号连接器（bob@gmail.com）/),
    ).toBeInTheDocument();
  });

  it("adds a custom MCP connector from the modal", async () => {
    render(<IntegrationsConsole />);
    await screen.findByText("已连接 1 个");
    fireEvent.click(screen.getAllByRole("button", { name: /自定义 MCP/ })[0]);
    const dialog = await screen.findByRole("dialog", {
      name: "新增自定义 MCP 连接器",
    });

    fireEvent.change(
      dialog.querySelector('input[placeholder*="CMDB"]') as HTMLInputElement,
      { target: { value: "CMDB MCP" } },
    );
    fireEvent.change(
      dialog.querySelector('input[type="url"]') as HTMLInputElement,
      { target: { value: "https://mcp.svc.plus" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "保存并接入" }));

    await waitFor(() =>
      expect(screen.getByText("CMDB MCP")).toBeInTheDocument(),
    );
  });
});
