import { z } from "zod";

import type { TokenDetail, TokenSummary } from "../../shared/contracts";
import { TokenDetailSchema, TokenSummarySchema } from "../../shared/contracts";
import { ApiFailure } from "../lib/http";
import { isSolanaAddress } from "../lib/solana";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
const MAX_RESPONSE_BYTES = 2_000_000;
const UPSTREAM_TIMEOUT_MS = 6_000;
const rawObject = z.record(z.string(), z.unknown());

type Fetcher = typeof fetch;

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalUrl(value: unknown): string | null {
  const candidate = optionalString(value);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function finiteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function nonnegativeInteger(...values: unknown[]): number | null {
  const parsed = finiteNumber(...values);
  return parsed !== null && parsed >= 0 ? Math.trunc(parsed) : null;
}

function isoTimestamp(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "number" && typeof value !== "string") continue;
    const numeric = Number(value);
    const date = Number.isFinite(numeric)
      ? new Date(numeric > 10_000_000_000 ? numeric : numeric * 1_000)
      : new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function normalizeSummary(
  raw: Record<string, unknown>,
  fallbackRank: number | null,
): TokenSummary | null {
  const address = optionalString(raw.address);
  if (!address || !isSolanaAddress(address)) return null;

  const symbol = optionalString(raw.symbol) ?? "UNKNOWN";
  const rawRank = nonnegativeInteger(raw.rank);
  return TokenSummarySchema.parse({
    address,
    symbol: symbol.slice(0, 24),
    name: (optionalString(raw.name) ?? symbol).slice(0, 120),
    logoUrl: optionalUrl(raw.logoURI ?? raw.logo_uri ?? raw.logo),
    rank: rawRank !== null && rawRank > 0 ? rawRank : fallbackRank,
    priceUsd: finiteNumber(raw.price),
    marketCapUsd: finiteNumber(
      raw.mc,
      raw.marketcap,
      raw.marketCap,
      raw.realMc,
    ),
    liquidityUsd: finiteNumber(raw.liquidity),
    volume24hUsd: finiteNumber(
      raw.volume24hUSD,
      raw.volume24hUsd,
      raw.v24hUSD,
      raw.volumeUSD,
    ),
    priceChange1hPercent: finiteNumber(
      raw.priceChange1hPercent,
      raw.price1hChangePercent,
    ),
    priceChange24hPercent: finiteNumber(
      raw.priceChange24hPercent,
      raw.price24hChangePercent,
      raw.v24hChangePercent,
    ),
    holders: nonnegativeInteger(raw.holder, raw.holders),
    listedAt: isoTimestamp(raw.liquidityAddedAt, raw.listTime, raw.createdAt),
  });
}

function getPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current))
      return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function findArray(value: unknown, paths: string[][]): unknown[] {
  for (const path of paths) {
    const candidate = getPath(value, path);
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new ApiFailure(
      502,
      "UPSTREAM_RESPONSE_TOO_LARGE",
      "Market data response was unexpectedly large.",
      true,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ApiFailure(
      502,
      "UPSTREAM_INVALID_JSON",
      "Market data returned an invalid response.",
      true,
    );
  }
}

async function birdeyeFetch(
  path: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<unknown> {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(`${BIRDEYE_BASE_URL}${path}`, {
        headers: {
          accept: "application/json",
          "x-api-key": apiKey,
          "x-chain": "solana",
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      lastStatus = response.status;

      if (response.ok) return await readBoundedJson(response);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      if (attempt === 1) {
        if (error instanceof ApiFailure) throw error;
        throw new ApiFailure(
          504,
          "UPSTREAM_TIMEOUT",
          "Market data did not respond in time.",
          true,
        );
      }
    }
  }

  if (lastStatus === 429) {
    throw new ApiFailure(
      429,
      "UPSTREAM_RATE_LIMITED",
      "Market data is temporarily rate limited.",
      true,
      30,
    );
  }
  throw new ApiFailure(
    502,
    "UPSTREAM_UNAVAILABLE",
    "Market data is temporarily unavailable.",
    true,
  );
}

function requireKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new ApiFailure(
      503,
      "MARKET_DATA_NOT_CONFIGURED",
      "Market data is not configured for this environment.",
      false,
    );
  }
  return apiKey;
}

export async function getTrending(
  apiKey: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<TokenSummary[]> {
  const json = await birdeyeFetch(
    "/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=50",
    requireKey(apiKey),
    fetcher,
  );
  const values = findArray(json, [
    ["data", "tokens"],
    ["data", "items"],
    ["data"],
  ]);
  return values.flatMap((value, index) => {
    const parsed = rawObject.safeParse(value);
    if (!parsed.success) return [];
    const token = normalizeSummary(parsed.data, index + 1);
    return token ? [token] : [];
  });
}

export async function getNewTokens(
  apiKey: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<TokenSummary[]> {
  const json = await birdeyeFetch(
    "/defi/v2/tokens/new_listing?limit=20&meme_platform_enabled=true",
    requireKey(apiKey),
    fetcher,
  );
  const values = findArray(json, [
    ["data", "items"],
    ["data", "tokens"],
    ["data"],
  ]);
  return values.flatMap((value) => {
    const parsed = rawObject.safeParse(value);
    if (!parsed.success) return [];
    const token = normalizeSummary(parsed.data, null);
    return token ? [token] : [];
  });
}

export async function getTokenDetail(
  address: string,
  apiKey: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<TokenDetail> {
  const json = await birdeyeFetch(
    `/defi/token_overview?address=${encodeURIComponent(address)}`,
    requireKey(apiKey),
    fetcher,
  );
  const parsed = rawObject.safeParse(getPath(json, ["data"]));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new ApiFailure(
      parsed.success ? 404 : 502,
      parsed.success ? "TOKEN_NOT_FOUND" : "UPSTREAM_SCHEMA_MISMATCH",
      parsed.success
        ? "No market data was found for this token."
        : "Market data returned an unexpected token shape.",
      !parsed.success,
    );
  }
  const summary = normalizeSummary({ ...parsed.data, address }, null);
  if (!summary)
    throw new ApiFailure(
      404,
      "TOKEN_NOT_FOUND",
      "No market data was found for this token.",
      false,
    );

  return TokenDetailSchema.parse({
    ...summary,
    decimals: nonnegativeInteger(parsed.data.decimals),
    supply: optionalString(parsed.data.supply),
    trades24h: nonnegativeInteger(parsed.data.trade24h, parsed.data.txns24h),
    buys24h: nonnegativeInteger(parsed.data.buy24h),
    sells24h: nonnegativeInteger(parsed.data.sell24h),
    uniqueWallets24h: nonnegativeInteger(parsed.data.uniqueWallet24h),
  });
}
