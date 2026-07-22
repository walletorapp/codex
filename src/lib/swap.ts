import {
  SwapExecuteResponseSchema,
  SwapOrderResponseSchema,
  type SwapExecuteResult,
  type SwapOrder,
} from "../../shared/swap-contracts";
import { ApiErrorSchema, type ApiError } from "../../shared/contracts";

export class SwapApiError extends Error {
  readonly code: string;

  constructor(payload: ApiError) {
    super(payload.error.message);
    this.name = "SwapApiError";
    this.code = payload.error.code;
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(raw);
    if (parsed.success) throw new SwapApiError(parsed.data);
    throw new Error("Walletor received an unreadable swap response.");
  }
  return raw;
}

export async function fetchSwapOrder(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  taker?: string;
  signal?: AbortSignal;
}): Promise<SwapOrder> {
  const query = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
  });
  if (params.taker) query.set("taker", params.taker);
  const response = await fetch(`/api/swap/order?${query.toString()}`, {
    headers: { accept: "application/json" },
    signal: params.signal,
  });
  const parsed = SwapOrderResponseSchema.safeParse(
    await parseResponse(response),
  );
  if (!parsed.success) throw new Error("Jupiter returned an invalid order.");
  return parsed.data.data;
}

export async function submitSignedSwap(input: {
  signedTransaction: string;
  requestId: string;
}): Promise<SwapExecuteResult> {
  const response = await fetch("/api/swap/execute", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const parsed = SwapExecuteResponseSchema.safeParse(
    await parseResponse(response),
  );
  if (!parsed.success)
    throw new Error("Jupiter returned an invalid execution result.");
  return parsed.data.data;
}
