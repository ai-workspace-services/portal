import { expect, test } from "@playwright/test";

test.describe("Marketing homepage experience", () => {
  test("renders updated hero copy and switches language dynamically", async ({
    page,
  }) => {
    await page.goto("/");

    const languageToggle = page.getByRole("combobox");
    await languageToggle.selectOption("zh");

    await expect(page.getByText("统一云原生与")).toBeVisible();
    await expect(page.getByText("网络运维，化繁为简，安全可控")).toBeVisible();
    await expect(page.getByText("主视觉插画占位符")).toBeVisible();
    await expect(
      page
        .getByText("此处放置 Xworkmate/Ai-workspace 的连线拓扑图/卡片图片", {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    await languageToggle.selectOption("en");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Unified Cloud-Native & Network Operations, Simplified",
      }),
    ).toBeVisible();
    await expect(page.getByText("Hero visual placeholder")).toBeVisible();
    await expect(
      page
        .getByText(
          "Xworkmate / Ai-workspace topology diagram or card artwork goes here",
          { exact: true },
        )
        .first(),
    ).toBeVisible();
  });
});
