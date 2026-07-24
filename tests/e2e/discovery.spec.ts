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
  await page.route("**/api/tokens/search?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            address: mint,
            symbol: "SOL",
            name: "Wrapped SOL",
            logoUrl: null,
            decimals: 9,
            isVerified: true,
            organicScore: 99,
          },
        ],
        meta: {
          source: "jupiter",
          fetchedAt: "2026-07-22T12:00:00.000Z",
          requestId: "test-request",
        },
      }),
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
  await expect(page.getByText("LIVE JUPITER ROUTING")).toBeVisible();
  await expect(page.getByText("VERIFIED WALLETOR ACTIVITY")).toBeVisible();
  await expect(page.getByText("CONFIRMED SWAPS ON THIS DEVICE")).toBeVisible();
  await page.getByLabel("Amount to pay").fill("1");
  await expect(page.getByLabel("Estimated amount received")).toContainText(
    "150",
  );
  await expect(page.getByText(/iris route · 0.01% impact/i)).toBeVisible();
  await expect(page.getByText("149 USDC")).toBeVisible();
  await expect(page.getByText("2 bps")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect Wallet" }),
  ).toBeVisible();
});

test("swap token selector searches Jupiter and warns about token risk", async ({
  page,
}) => {
  await page.goto("/swap");
  await page
    .getByRole("button", { name: "Choose token, currently SOL" })
    .click();
  await page.getByPlaceholder("Search name, symbol, or mint").fill("SOL");
  await expect(page.getByText("Wrapped SOL")).toBeVisible();
  await expect(page.getByText(/Anyone can create a token/i)).toBeVisible();
});

test("history counts only confirmed Walletor swaps stored on this device", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "walletor.confirmed-swaps.v1",
      JSON.stringify([
        {
          signature:
            "5vP3dHkNQ3S5uTnY8MqNc4n6fL7xR2kJ9aB1cD4eF6gH7iJ8kL9mN2pQ3rS4tU5v",
          confirmedAt: "2026-07-22T12:00:00.000Z",
          wallet: "So11111111111111111111111111111111111111112",
          inputToken: {
            symbol: "SOL",
            mint: "So11111111111111111111111111111111111111112",
          },
          outputToken: {
            symbol: "USDC",
            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          },
          inputAmount: "1",
          outputAmount: "150",
          inputUsdValue: 150,
        },
      ]),
    );
  });
  await page.goto("/swap?view=history");
  await expect(page.getByText("1 SOL → 150 USDC")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Confirmed swaps" }),
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
