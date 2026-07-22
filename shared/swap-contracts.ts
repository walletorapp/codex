import { z } from "zod";

const numericString = z.string().regex(/^\d+$/);

export const SwapOrderDataSchema = z.object({
  requestId: z.string().min(1).max(200),
  transaction: z.string().min(1).nullable(),
  inputMint: z.string().min(32).max(44),
  outputMint: z.string().min(32).max(44),
  inAmount: numericString,
  outAmount: numericString,
  otherAmountThreshold: numericString.nullable(),
  priceImpactPct: z.string().nullable(),
  inUsdValue: z.number().nullable(),
  outUsdValue: z.number().nullable(),
  router: z.string().nullable(),
  mode: z.string().nullable(),
  feeBps: z.number().int().nonnegative().nullable(),
  feeMint: z.string().nullable(),
});

export const SwapOrderResponseSchema = z.object({
  data: SwapOrderDataSchema,
  meta: z.object({
    source: z.literal("jupiter"),
    fetchedAt: z.iso.datetime(),
    requestId: z.string().min(1),
  }),
});

export const SwapExecuteRequestSchema = z.object({
  signedTransaction: z
    .string()
    .min(100)
    .max(100_000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  requestId: z.string().min(1).max(200),
  lastValidBlockHeight: z.string().regex(/^\d+$/).optional(),
});

export const SwapExecuteDataSchema = z.object({
  status: z.enum(["Success", "Failed"]),
  signature: z.string().nullable(),
  code: z.number().int(),
  error: z.string().nullable(),
  inputAmountResult: numericString.nullable(),
  outputAmountResult: numericString.nullable(),
});

export const SwapExecuteResponseSchema = z.object({
  data: SwapExecuteDataSchema,
  meta: z.object({
    source: z.literal("jupiter"),
    fetchedAt: z.iso.datetime(),
    requestId: z.string().min(1),
  }),
});

export type SwapOrder = z.infer<typeof SwapOrderDataSchema>;
export type SwapExecuteResult = z.infer<typeof SwapExecuteDataSchema>;
