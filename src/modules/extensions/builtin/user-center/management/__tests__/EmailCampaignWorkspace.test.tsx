import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmailCampaignWorkspace from "../components/EmailCampaignWorkspace";

const mocks = vi.hoisted(() => ({ request: vi.fn(), mutate: vi.fn() }));
vi.mock("@i18n/LanguageProvider", () => ({
  useLanguage: () => ({ language: "zh" }),
}));
vi.mock("swr", () => ({
  default: () => ({
    data: { campaigns: [], senderReady: true, backgroundEnabled: true },
    mutate: mocks.mutate,
  }),
}));
vi.mock("@/lib/email-preferences", async (original) => ({
  ...(await original<typeof import("@/lib/email-preferences")>()),
  emailRequest: mocks.request,
}));
vi.mock("../components/EmailDeliveryPanel", () => ({
  default: () => <div>Delivery log</div>,
}));
beforeEach(() => {
  vi.clearAllMocks();
});
describe("campaign composition and confirmation", () => {
  it("requires a saved preview and explicit confirmation before queueing", async () => {
    const campaign = {
      id: "campaign-1",
      version: 1,
      kind: "feature",
      subject: "New release",
      body: "Release details",
      actionLabel: "",
      actionUrl: "",
      audience: "all",
      deliveryMode: "important",
      status: "draft",
    };
    mocks.request
      .mockResolvedValueOnce(campaign)
      .mockResolvedValueOnce({
        version: 1,
        recipients: 2,
        matched: 4,
        excluded: 2,
        plainBody: "New release\nRelease details",
        audienceDigest: "reviewed-audience",
      })
      .mockResolvedValueOnce({ queued: 2 });
    render(<EmailCampaignWorkspace />);
    expect(
      screen.getByRole("button", { name: "预览内容与受众" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("邮件标题"), {
      target: { value: "New release" },
    });
    fireEvent.change(screen.getByLabelText("正文（纯文本）"), {
      target: { value: "Release details" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
    await screen.findByRole("status");
    fireEvent.click(screen.getByRole("button", { name: "预览内容与受众" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "加入发送队列" }),
    );
    expect(
      screen.getByRole("group", { name: "确认加入队列" }),
    ).toBeInTheDocument();
    expect(
      mocks.request.mock.calls.some(([path]) => path.endsWith("/launch")),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "确认加入队列" }));
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        "/api/auth/admin/email-campaigns/campaign-1/launch",
        expect.objectContaining({
          body: JSON.stringify({
            version: 1,
            recipients: 2,
            audienceDigest: "reviewed-audience",
          }),
        }),
      ),
    );
    expect(await screen.findByText("活动已加入发送队列")).toBeInTheDocument();
  });
  it("invalidates the preview when the operator changes the saved content", async () => {
    mocks.request
      .mockResolvedValueOnce({
        id: "campaign-1",
        version: 1,
        kind: "announcement",
        subject: "News",
        body: "Details",
        actionLabel: "",
        actionUrl: "",
        audience: "all",
        deliveryMode: "important",
        status: "draft",
      })
      .mockResolvedValueOnce({
        version: 1,
        recipients: 1,
        matched: 1,
        excluded: 0,
        plainBody: "News",
        audienceDigest: "digest",
      });
    render(<EmailCampaignWorkspace />);
    fireEvent.change(screen.getByLabelText("邮件标题"), {
      target: { value: "News" },
    });
    fireEvent.change(screen.getByLabelText("正文（纯文本）"), {
      target: { value: "Details" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存草稿" }));
    await screen.findByRole("status");
    fireEvent.click(screen.getByRole("button", { name: "预览内容与受众" }));
    await screen.findByRole("button", { name: "加入发送队列" });
    fireEvent.change(screen.getByLabelText("正文（纯文本）"), {
      target: { value: "Changed details" },
    });
    expect(screen.queryByRole("button", { name: "加入发送队列" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "预览内容与受众" }),
    ).toBeDisabled();
  });
});
