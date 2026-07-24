import type { z } from "zod";

import {
  ApiErrorSchema,
  SwapTokenSearchResponseSchema,
  TokenDetailResponseSchema,
  TokenListResponseSchema,
  type ApiError as ApiErrorPayload,
  type SwapTokenSearchResult,
  type TokenDetail,
  type TokenSummary,
} from "../../shared/contracts";

export class ApiClientError extends Error {
  readonly retryable: boolean;
  readonly code: string;
  readonly requestId: string | null;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.error.message);
    this.name = "ApiClientError";
    this.code = payload.error.code;
    this.retryable = payload.error.retryable;
    this.requestId = payload.meta.requestId;
    Object.defineProperty(this, "status", { value: status });
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    headers: { accept: "application/json" },
    signal,
  });
  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(raw);
    if (parsed.success) throw new ApiClientError(parsed.data, response.status);
    throw new Error("Walletor received an unreadable API error.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new Error("Walletor received market data in an unexpected format.");
  return parsed.data;
}

export async function fetchTrending(
  signal?: AbortSignal,
): Promise<TokenSummary[]> {
  return (
    await request("/api/tokens/trending", TokenListResponseSchema, signal)
  ).data;
}

export async function fetchNewTokens(
  signal?: AbortSignal,
): Promise<TokenSummary[]> {
  return (await request("/api/tokens/new", TokenListResponseSchema, signal))
    .data;
}

export async function fetchToken(
  address: string,
  signal?: AbortSignal,
): Promise<TokenDetail> {
  return (
    await request(
      `/api/tokens/${encodeURIComponent(address)}`,
      TokenDetailResponseSchema,
      signal,
    )
  ).data;
}

export async function searchSwapTokens(
  query: string,
  signal?: AbortSignal,
): Promise<SwapTokenSearchResult[]> {
  return (
    await request(
      `/api/tokens/search?q=${encodeURIComponent(query)}`,
      SwapTokenSearchResponseSchema,
      signal,
    )
  ).data;
}
