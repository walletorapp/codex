import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

import { isSolanaAddress } from "./lib/solana";
import { ApiFailure, publicCacheHeaders, requestIdFrom } from "./lib/http";
import { getNewTokens, getTokenDetail, getTrending } from "./services/jupiter";
import { executeSwap, getSwapOrder } from "./services/jupiter-swap";

export const app = new Hono<{ Bindings: Partial<Env> }>();

app.use("/api/*", secureHeaders());

app.get("/api/health", (c) =>
  c.json({
    data: { status: "ok", service: "walletor-api" },
    meta: { requestId: requestIdFrom(c) },
  }),
);

app.get("/api/tokens/trending", async (c) => {
  const data = await getTrending(c.env.JUPITER_API_KEY);
  c.header("Cache-Control", publicCacheHeaders(20)["Cache-Control"]);
  c.header("Vary", "Accept-Encoding");
  return c.json({ data, meta: marketMeta(requestIdFrom(c)) });
});

app.get("/api/tokens/new", async (c) => {
  const data = await getNewTokens(c.env.JUPITER_API_KEY);
  c.header("Cache-Control", publicCacheHeaders(30)["Cache-Control"]);
  c.header("Vary", "Accept-Encoding");
  return c.json({ data, meta: marketMeta(requestIdFrom(c)) });
});

app.get("/api/tokens/:address", async (c) => {
  const address = c.req.param("address");
  if (!isSolanaAddress(address)) {
    throw new ApiFailure(
      400,
      "INVALID_SOLANA_ADDRESS",
      "Enter a valid Solana token mint address.",
      false,
    );
  }
  const data = await getTokenDetail(address, c.env.JUPITER_API_KEY);
  c.header("Cache-Control", publicCacheHeaders(20)["Cache-Control"]);
  c.header("Vary", "Accept-Encoding");
  return c.json({ data, meta: marketMeta(requestIdFrom(c)) });
});

app.get("/api/swap/order", async (c) => {
  const data = await getSwapOrder(
    {
      inputMint: c.req.query("inputMint") ?? "",
      outputMint: c.req.query("outputMint") ?? "",
      amount: c.req.query("amount") ?? "",
      taker: c.req.query("taker"),
    },
    c.env.JUPITER_API_KEY,
  );
  c.header("Cache-Control", "no-store");
  return c.json({ data, meta: marketMeta(requestIdFrom(c)) });
});

app.post("/api/swap/execute", async (c) => {
  const contentLength = Number(c.req.header("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 150_000) {
    throw new ApiFailure(
      413,
      "REQUEST_TOO_LARGE",
      "The signed transaction payload is too large.",
      false,
    );
  }
  const input: unknown = await c.req.json().catch(() => null);
  const data = await executeSwap(input, c.env.JUPITER_API_KEY);
  c.header("Cache-Control", "no-store");
  return c.json({ data, meta: marketMeta(requestIdFrom(c)) });
});

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "API route not found.",
        retryable: false,
      },
      meta: { requestId: requestIdFrom(c) },
    },
    404,
  ),
);

app.onError((error, c) => {
  const requestId = requestIdFrom(c);
  const failure =
    error instanceof ApiFailure
      ? error
      : new ApiFailure(
          500,
          "INTERNAL_ERROR",
          "An unexpected server error occurred.",
          true,
        );

  console.error(
    JSON.stringify({
      message: "api_request_failed",
      requestId,
      method: c.req.method,
      path: c.req.path,
      code: failure.code,
      status: failure.status,
    }),
  );
  if (failure.retryAfter) c.header("Retry-After", String(failure.retryAfter));
  c.header("Cache-Control", "no-store");
  return c.json(
    {
      error: {
        code: failure.code,
        message: failure.message,
        retryable: failure.retryable,
      },
      meta: { requestId },
    },
    failure.status,
  );
});

function marketMeta(requestId: string) {
  return {
    source: "jupiter" as const,
    fetchedAt: new Date().toISOString(),
    requestId,
  };
}
