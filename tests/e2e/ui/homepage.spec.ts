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
        name: "从对话到交付， 一个 AI 工作空间 完成全部工作",
      }),
    ).toBeVisible();
    await expect(page.getByText("完整工作闭环")).toBeVisible();
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
    await expect(page.getByText("开放的 AI 工作空间")).toBeVisible();

    await languageToggle.selectOption("en");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "From conversation to delivery, one AI workspace for the work that matters",
      }),
    ).toBeVisible();
    await expect(page.getByText("One continuous workflow")).toBeVisible();
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
    await expect(page.getByText("Open AI Workspace")).toBeVisible();
  });
});
