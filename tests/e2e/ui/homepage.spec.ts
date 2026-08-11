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
  });
});
