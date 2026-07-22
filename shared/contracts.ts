import { z } from "zod";

const nullableNumber = z.number().nullable();
const nullableInteger = z.number().int().nonnegative().nullable();

export const TokenSummarySchema = z.object({
  address: z.string().min(32).max(44),
  symbol: z.string().min(1).max(24),
  name: z.string().min(1).max(120),
  logoUrl: z.url().nullable(),
  rank: z.number().int().positive().nullable(),
  priceUsd: nullableNumber,
  marketCapUsd: nullableNumber,
  liquidityUsd: nullableNumber,
  volume24hUsd: nullableNumber,
  priceChange1hPercent: nullableNumber,
  priceChange24hPercent: nullableNumber,
  holders: nullableInteger,
  listedAt: z.iso.datetime().nullable(),
});

export const TokenDetailSchema = TokenSummarySchema.extend({
  decimals: z.number().int().min(0).max(18).nullable(),
  supply: z.string().nullable(),
  trades24h: nullableInteger,
  buys24h: nullableInteger,
  sells24h: nullableInteger,
  uniqueWallets24h: nullableInteger,
});

export const ResponseMetaSchema = z.object({
  source: z.literal("jupiter"),
  fetchedAt: z.iso.datetime(),
  requestId: z.string().min(1),
});

export const TokenListResponseSchema = z.object({
  data: z.array(TokenSummarySchema),
  meta: ResponseMetaSchema,
});

export const TokenDetailResponseSchema = z.object({
  data: TokenDetailSchema,
  meta: ResponseMetaSchema,
});

export const HealthResponseSchema = z.object({
  data: z.object({
    status: z.literal("ok"),
    service: z.literal("walletor-api"),
  }),
  meta: z.object({ requestId: z.string().min(1) }),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
  meta: z.object({ requestId: z.string().min(1) }),
});

export type TokenSummary = z.infer<typeof TokenSummarySchema>;
export type TokenDetail = z.infer<typeof TokenDetailSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
