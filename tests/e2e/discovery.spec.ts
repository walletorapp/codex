import { expect, test } from "@playwright/test";

import { apiDetail, apiList, mint } from "../fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/tokens/trending", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(apiList()),
    }),
  );
  await page.route("**/api/tokens/new", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(apiList()),
    }),
  );
  await page.route(`**/api/tokens/${mint}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(apiDetail()),
    }),
  );
});

test("trending discovery links to a semantic token route", async ({ page }) => {
  await page.goto("/trending");
  await expect(
    page.getByRole("heading", { name: "Trending on Solana" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /SOL/i }).click();
  await expect(page).toHaveURL(`/tokens/${mint}`);
  await expect(page.getByRole("heading", { name: "SOL" })).toBeVisible();
  await expect(page.getByText("Trading is not enabled")).toBeVisible();
});

test("new-token radar uses the correct responsive navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/new-tokens");
  await expect(
    page.getByRole("heading", { name: "Fresh Solana listings" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Wrapped SOL/i })).toBeVisible();
  if (testInfo.project.name === "mobile-chromium") {
    await expect(
      page.getByRole("button", { name: "Toggle navigation" }),
    ).toBeVisible();
  } else {
    await expect(page.getByLabel("Primary navigation")).toBeVisible();
  }
});

test("direct token navigation survives SPA fallback", async ({ page }) => {
  await page.goto(`/tokens/${mint}`);
  await expect(page.getByRole("heading", { name: "SOL" })).toBeVisible();
  await expect(
    page.getByTitle("SOL market chart on Dexscreener"),
  ).toBeVisible();
});
