import { expect, test } from "@playwright/test";

test.describe("Marketing homepage experience", () => {
  test("renders the outcome hero and core capabilities in both languages", async ({
    page,
  }) => {
    await page.goto("/");

    const languageToggle = page.getByRole("combobox");
    await languageToggle.selectOption("zh");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "开放的 AI 工作空间",
      }),
    ).toBeVisible();
    await expect(
      page.locator("nav").getByRole("link", { name: "免费试用" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("告别 AI 工具碎片化，一个 Workspace 连接你的所有 AI。"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "不用在 ChatGPT、Claude、Gemini、Agent、插件和各种工具之间反复切换。XWorkmate 将 AI 模型、智能助手、工具和数据连接到一个统一工作空间，让你从想法到成果，在一个地方完成。",
      ),
    ).toBeVisible();
    await expect(page.getByText("One AI Workspace for all your AI.")).toBeVisible();
    await expect(page.getByText("聊天很强，交付仍难")).toBeVisible();
    await expect(page.getByRole("img", { name: "OpenClaw" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Hermes Agent" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Codex" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 3, name: "把工作计划清楚" }),
    ).toBeVisible();
    await expect(page.getByText("连接需要的能力")).toBeVisible();
    await expect(page.getByText("把结果可靠交付")).toBeVisible();
    await expect(page.getByText("三端同一工作空间")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "从想法到结果，每一步都可连接、可追踪、可交付",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "安全、权限、连接与部署，都由你掌控",
      }),
    ).toBeVisible();
    await expect(page.getByText("产品事实与证明")).toBeVisible();
    await expect(page.getByRole("link", { name: "XConnect" })).toBeVisible();
    await expect(page.getByText("先跑通一个真实任务")).toBeVisible();
    const heroFigure = page.locator("figure").first();
    await expect(heroFigure).not.toContainText("AI 模型");
    await expect(heroFigure).not.toContainText("AI Agents");
    await expect(heroFigure).not.toContainText("Connectors");
    await expect(heroFigure).not.toContainText("Workspace Context");
    await expect(heroFigure).not.toContainText("Delivered Results");
    await expect(page.locator("figure img").first()).toHaveAttribute(
      "src",
      /ai-workspace-suite-zh\.png$/,
    );

    await languageToggle.selectOption("en");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "An open AI workspace",
      }),
    ).toBeVisible();
    await expect(
      page.locator("nav").getByRole("link", { name: "Try it free" }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "Say goodbye to fragmented AI tools. One Workspace connects all your AI.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Stop switching between ChatGPT, Claude, Gemini, agents, plugins, and other tools. XWorkmate brings AI models, assistants, tools, and data into one unified workspace, so you can go from idea to outcome in one place.",
      ),
    ).toBeVisible();
    await expect(page.getByText("One AI Workspace for all your AI.")).toBeVisible();
    await expect(page.getByText("Chat is powerful. Delivery is still hard.")).toBeVisible();
    await expect(page.getByRole("img", { name: "OpenClaw" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Hermes Agent" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Codex" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 3, name: "Make the work clear" }),
    ).toBeVisible();
    await expect(
      page.getByText("Bring in the right capabilities"),
    ).toBeVisible();
    await expect(page.getByText("Turn progress into delivery")).toBeVisible();
    await expect(page.getByText("One workspace, three surfaces")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "From ideas to outcomes, every step stays connected, traceable, and deliverable",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Security, permissions, connections, and deployment stay in your hands",
      }),
    ).toBeVisible();
    await expect(page.getByText("Product facts and proof")).toBeVisible();
    await expect(page.getByRole("link", { name: "XConnect" })).toBeVisible();
    await expect(page.getByText("Run one real task end to end")).toBeVisible();
    await expect(heroFigure).not.toContainText("AI Models");
    await expect(heroFigure).not.toContainText("AI Agents");
    await expect(heroFigure).not.toContainText("Connectors");
    await expect(heroFigure).not.toContainText("Workspace Context");
    await expect(heroFigure).not.toContainText("Delivered Results");
    await expect(page.locator("figure img").first()).toHaveAttribute(
      "src",
      /ai-workspace-suite-en\.png$/,
    );
  });
});
