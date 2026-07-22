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
        Response.json({
          data: {
            tokens: [
              {
                address: mint,
                symbol: "SOL",
                name: "Wrapped SOL",
                rank: 1,
                price: 150,
                liquidity: 1000,
              },
            ],
          },
        }),
      ),
    );
    const response = await app.request("/api/tokens/trending", undefined, {
      BIRDEYE_API_KEY: "test-only",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=20");
    await expect(response.json()).resolves.toMatchObject({
      data: [{ address: mint, symbol: "SOL", priceUsd: 150 }],
    });
  });

  it("uses Birdeye's current v2 new-listing endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { items: [] } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await app.request("/api/tokens/new", undefined, {
      BIRDEYE_API_KEY: "test-only",
    });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/defi/v2/tokens/new_listing"),
      expect.any(Object),
    );
  });

  it("rejects invalid token addresses before calling Birdeye", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await app.request("/api/tokens/not-a-mint", undefined, {
      BIRDEYE_API_KEY: "test-only",
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
