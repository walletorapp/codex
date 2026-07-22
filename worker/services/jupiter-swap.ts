import { z } from "zod";

import {
  SwapExecuteDataSchema,
  SwapExecuteRequestSchema,
  SwapOrderDataSchema,
  type SwapExecuteResult,
  type SwapOrder,
} from "../../shared/swap-contracts";
import { ApiFailure } from "../lib/http";
import { isSolanaAddress } from "../lib/solana";

const JUPITER_SWAP_URL = "https://api.jup.ag/swap/v2";
const MAX_RESPONSE_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;
const rawObject = z.record(z.string(), z.unknown());

type Fetcher = typeof fetch;

function requireKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new ApiFailure(
      503,
      "SWAP_NOT_CONFIGURED",
      "Jupiter swaps are not configured for this environment.",
      false,
    );
  }
  return apiKey;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function boundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
    throw new ApiFailure(
      502,
      "UPSTREAM_RESPONSE_TOO_LARGE",
      "Jupiter returned an unexpectedly large response.",
      true,
    );
  }

  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
    throw new ApiFailure(
      502,
      "UPSTREAM_RESPONSE_TOO_LARGE",
      "Jupiter returned an unexpectedly large response.",
      true,
    );
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiFailure(
      502,
      "UPSTREAM_INVALID_JSON",
      "Jupiter returned an invalid response.",
      true,
    );
  }
}

async function jupiterRequest(
  path: string,
  apiKey: string | undefined,
  init: RequestInit,
  fetcher: Fetcher,
): Promise<unknown> {
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    headers.set("x-api-key", requireKey(apiKey));
    response = await fetcher(`${JUPITER_SWAP_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiFailure(
      504,
      "JUPITER_TIMEOUT",
      "Jupiter did not respond in time.",
      true,
    );
  }

  const json = await boundedJson(response);
  if (response.ok) return json;
  if (response.status === 401 || response.status === 403) {
    throw new ApiFailure(
      503,
      "JUPITER_AUTH_FAILED",
      "Jupiter credentials were rejected.",
      false,
    );
  }
  if (response.status === 429) {
    throw new ApiFailure(
      429,
      "JUPITER_RATE_LIMITED",
      "Jupiter is temporarily rate limited.",
      true,
      30,
    );
  }
  throw new ApiFailure(
    response.status >= 500 ? 502 : 400,
    "JUPITER_SWAP_REJECTED",
    "Jupiter could not prepare this swap.",
    response.status >= 500,
  );
}

export async function getSwapOrder(
  params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    taker?: string;
  },
  apiKey: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<SwapOrder> {
  if (
    !isSolanaAddress(params.inputMint) ||
    !isSolanaAddress(params.outputMint) ||
    params.inputMint === params.outputMint
  ) {
    throw new ApiFailure(
      400,
      "INVALID_SWAP_PAIR",
      "Choose two different valid Solana tokens.",
      false,
    );
  }
  if (!/^\d+$/.test(params.amount) || params.amount === "0") {
    throw new ApiFailure(
      400,
      "INVALID_SWAP_AMOUNT",
      "Enter a valid positive swap amount.",
      false,
    );
  }
  if (params.taker && !isSolanaAddress(params.taker)) {
    throw new ApiFailure(
      400,
      "INVALID_TAKER",
      "Connect a valid Solana wallet.",
      false,
    );
  }

  const query = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
  });
  if (params.taker) query.set("taker", params.taker);

  const json = await jupiterRequest(
    `/order?${query.toString()}`,
    apiKey,
    { method: "GET" },
    fetcher,
  );
  const raw = rawObject.safeParse(json);
  if (!raw.success) {
    throw new ApiFailure(
      502,
      "JUPITER_SCHEMA_MISMATCH",
      "Jupiter returned an unexpected order.",
      true,
    );
  }

  const order = SwapOrderDataSchema.safeParse({
    requestId: raw.data.requestId,
    transaction: nullableString(raw.data.transaction),
    inputMint: raw.data.inputMint,
    outputMint: raw.data.outputMint,
    inAmount: raw.data.inAmount,
    outAmount: raw.data.outAmount,
    otherAmountThreshold: nullableString(raw.data.otherAmountThreshold),
    priceImpactPct: nullableString(raw.data.priceImpactPct),
    inUsdValue: nullableNumber(raw.data.inUsdValue),
    outUsdValue: nullableNumber(raw.data.outUsdValue),
    router: nullableString(raw.data.router),
    mode: nullableString(raw.data.mode),
    feeBps: nullableNumber(raw.data.feeBps),
    feeMint: nullableString(raw.data.feeMint),
  });
  if (!order.success) {
    throw new ApiFailure(
      502,
      "JUPITER_SCHEMA_MISMATCH",
      "Jupiter returned an unexpected order.",
      true,
    );
  }
  return order.data;
}

export async function executeSwap(
  input: unknown,
  apiKey: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<SwapExecuteResult> {
  const request = SwapExecuteRequestSchema.safeParse(input);
  if (!request.success) {
    throw new ApiFailure(
      400,
      "INVALID_SIGNED_TRANSACTION",
      "The signed Jupiter transaction is invalid.",
      false,
    );
  }
  const json = await jupiterRequest(
    "/execute",
    apiKey,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.data),
    },
    fetcher,
  );
  const raw = rawObject.safeParse(json);
  if (!raw.success) {
    throw new ApiFailure(
      502,
      "JUPITER_SCHEMA_MISMATCH",
      "Jupiter returned an unexpected execution result.",
      true,
    );
  }
  const result = SwapExecuteDataSchema.safeParse({
    status: raw.data.status,
    signature: nullableString(raw.data.signature),
    code: raw.data.code,
    error: nullableString(raw.data.error),
    inputAmountResult: nullableString(raw.data.inputAmountResult),
    outputAmountResult: nullableString(raw.data.outputAmountResult),
  });
  if (!result.success) {
    throw new ApiFailure(
      502,
      "JUPITER_SCHEMA_MISMATCH",
      "Jupiter returned an unexpected execution result.",
      true,
    );
  }
  return result.data;
}
