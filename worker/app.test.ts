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

  it("searches Jupiter tokens for the swap selector", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json([
        {
          id: mint,
          symbol: "SOL",
          name: "Wrapped SOL",
          decimals: 9,
          icon: "https://example.com/sol.png",
          isVerified: true,
          organicScore: 99,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.request("/api/tokens/search?q=SOL", undefined, {
      JUPITER_API_KEY: "test-only",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/tokens/v2/search?query=SOL"),
      expect.any(Object),
    );
    await expect(response.json()).resolves.toMatchObject({
      data: [
        {
          address: mint,
          symbol: "SOL",
          decimals: 9,
          isVerified: true,
          organicScore: 99,
        },
      ],
    });
  });

  it("rejects an empty swap-token search before calling Jupiter", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await app.request("/api/tokens/search?q=", undefined, {
      JUPITER_API_KEY: "test-only",
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("proxies a validated Jupiter Swap V2 quote without caching it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        requestId: "order-123",
        transaction: null,
        inputMint: mint,
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
        feeMint: mint,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.request(
      `/api/swap/order?inputMint=${mint}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000`,
      undefined,
      { JUPITER_API_KEY: "test-only" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/swap/v2/order?"),
      expect.objectContaining({ method: "GET" }),
    );
    await expect(response.json()).resolves.toMatchObject({
      data: { requestId: "order-123", outAmount: "150000000" },
      meta: { source: "jupiter" },
    });
  });

  it("only reports a swap as successful from Jupiter execute", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          status: "Success",
          signature: "confirmed-signature",
          code: 0,
          inputAmountResult: "1000000000",
          outputAmountResult: "150000000",
        }),
      ),
    );
    const response = await app.request(
      "/api/swap/execute",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          signedTransaction: "a".repeat(200),
          requestId: "order-123",
        }),
      },
      { JUPITER_API_KEY: "test-only" },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { status: "Success", signature: "confirmed-signature", code: 0 },
    });
  });
});
