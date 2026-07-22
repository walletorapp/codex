import { afterEach, describe, expect, it, vi } from "vitest";

import { mint } from "../tests/fixtures";
import { app } from "./app";

describe("Walletor API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns health without an upstream secret", async () => {
    const response = await app.request("/api/health", undefined, {});
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { status: "ok", service: "walletor-api" },
    });
  });

  it("normalizes trending tokens and sets shared cache policy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            id: mint,
            symbol: "SOL",
            name: "Wrapped SOL",
            usdPrice: 150,
            liquidity: 1000,
            stats24h: { buyVolume: 600, sellVolume: 400 },
          },
        ]),
      ),
    );
    const response = await app.request("/api/tokens/trending", undefined, {
      JUPITER_API_KEY: "test-only",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=20");
    await expect(response.json()).resolves.toMatchObject({
      data: [{ address: mint, symbol: "SOL", priceUsd: 150 }],
    });
  });

  it("uses Jupiter's recent first-pool endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    const response = await app.request("/api/tokens/new", undefined, {
      JUPITER_API_KEY: "test-only",
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/tokens/v2/recent"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "test-only" }),
      }),
    );
  });

  it("maps Jupiter search data into token detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json([
        {
          id: mint,
          symbol: "SOL",
          name: "Wrapped SOL",
          decimals: 9,
          totalSupply: "12345678901234567890",
          usdPrice: 150,
          mcap: 100_000,
          holderCount: 42,
          stats24h: {
            buyVolume: 600,
            sellVolume: 400,
            numBuys: 7,
            numSells: 3,
            numTraders: 8,
          },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.request(`/api/tokens/${mint}`, undefined, {
      JUPITER_API_KEY: "test-only",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/tokens/v2/search?query=${mint}`),
      expect.any(Object),
    );
    await expect(response.json()).resolves.toMatchObject({
      data: {
        address: mint,
        supply: "12345678901234567890",
        volume24hUsd: 1000,
        trades24h: 10,
        buys24h: 7,
        sells24h: 3,
        uniqueWallets24h: 8,
      },
      meta: { source: "jupiter" },
    });
  });

  it("reports rejected Jupiter credentials without exposing them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await app.request("/api/tokens/trending", undefined, {
      JUPITER_API_KEY: "test-only",
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MARKET_DATA_AUTH_FAILED", retryable: false },
    });
  });

  it("rejects invalid token addresses before calling Jupiter", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await app.request("/api/tokens/not-a-mint", undefined, {
      JUPITER_API_KEY: "test-only",
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_SOLANA_ADDRESS", retryable: false },
    });
  });

  it("does not leak missing-secret details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await app.request("/api/tokens/trending", undefined, {});
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MARKET_DATA_NOT_CONFIGURED" },
    });
  });
});
