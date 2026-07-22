import { expect, test } from "@playwright/test";

import { apiDetail, apiList, mint } from "../fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/swap/order?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          requestId: "e2e-order",
          transaction: null,
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          inAmount: "1000000000",
          outAmount: "150000000",
          otherAmountThreshold: "149000000",
          priceImpactPct: "0.01",
          inUsdValue: 150,
          outUsdValue: 149.9,
          router: "iris",
          mode: "ultra",
          feeBps: 2,
          feeMint: "So11111111111111111111111111111111111111112",
        },
        meta: {
          source: "jupiter",
          fetchedAt: "2026-07-22T12:00:00.000Z",
          requestId: "test-request",
        },
      }),
    }),
  );
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

test("Walletor opens on the DEX and displays a Jupiter quote", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/swap$/);
  await expect(page.getByText("REVENUE FIGURES ARE VISUAL ONLY")).toBeVisible();
  await page.getByLabel("Amount to pay").fill("1");
  await expect(page.getByLabel("Estimated amount received")).toContainText(
    "150",
  );
  await expect(page.getByText(/iris · 0.01% impact/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect Wallet" }),
  ).toBeVisible();
});

test("trending discovery links to a semantic token route", async ({ page }) => {
  await page.goto("/trending");
  await expect(
    page.getByRole("heading", { name: "Trending on Solana" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /SOL/i }).click();
  await expect(page).toHaveURL(`/tokens/${mint}`);
  await expect(page.getByRole("heading", { name: "SOL" })).toBeVisible();
  await expect(page.getByText("Trade through Jupiter")).toBeVisible();
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
