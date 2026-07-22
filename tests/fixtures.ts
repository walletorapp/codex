import type { TokenDetail, TokenSummary } from "../shared/contracts";

export const mint = "So11111111111111111111111111111111111111112";

export const token: TokenSummary = {
  address: mint,
  symbol: "SOL",
  name: "Wrapped SOL",
  logoUrl: null,
  rank: 1,
  priceUsd: 156.42,
  marketCapUsd: 80_000_000_000,
  liquidityUsd: 18_500_000,
  volume24hUsd: 2_100_000_000,
  priceChange1hPercent: 0.42,
  priceChange24hPercent: 3.14,
  holders: 1_200_000,
  listedAt: "2024-01-01T00:00:00.000Z",
};

export const tokenDetail: TokenDetail = {
  ...token,
  decimals: 9,
  supply: "510000000000000000",
  trades24h: 120_000,
  buys24h: 64_000,
  sells24h: 56_000,
  uniqueWallets24h: 43_000,
};

export function apiList(data: TokenSummary[] = [token]) {
  return {
    data,
    meta: {
      source: "jupiter",
      fetchedAt: "2026-07-22T12:00:00.000Z",
      requestId: "test-request",
    },
  };
}

export function apiDetail(data: TokenDetail = tokenDetail) {
  return {
    data,
    meta: {
      source: "jupiter",
      fetchedAt: "2026-07-22T12:00:00.000Z",
      requestId: "test-request",
    },
  };
}
