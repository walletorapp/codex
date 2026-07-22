# Walletor architecture

## Current shape

```text
React SPA (Vite, React Router, TanStack Query)
  -> Wallet Standard discovery and wallet signature
  -> same-origin /api client
  -> Hono Worker
       -> request/address validation
       -> Jupiter Tokens V2 adapter (timeout, one safe retry, response validation)
       -> Jupiter Swap V2 order/execute adapter (no-store, response validation)
       -> normalized shared contracts + cache/error headers
  -> Cloudflare Workers Static Assets (SPA fallback)
```

The browser and API are one deployable Worker project. `assets.run_worker_first` scopes execution to `/api/*`; missing client routes fall back to `index.html`. No persistence is used because the browser and Worker do not author trade, fee, pool, or reward accounting.

## Current-source decisions (checked 2026-07-22)

- Cloudflare recommends Workers Static Assets for new full-stack/SPAs and its Vite plugin for local `workerd` parity. SPA routing uses `assets.not_found_handling: "single-page-application"`. Sources: [React + Vite](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/), [Vite plugin static assets](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/), [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
- Jupiter stays behind the Worker and shares one developer-platform key with later swap APIs. Trending uses `/tokens/v2/toptrending/24h`, new listings use `/tokens/v2/recent`, and token detail uses exact-mint `/tokens/v2/search`. Source: [Jupiter Tokens V2](https://developers.jup.ag/docs/tokens/token-information).
- The DEX uses Jupiter Swap V2 `/order` and `/execute`. The browser receives an unsigned order transaction, asks the connected wallet to sign it, and returns the signed transaction plus Jupiter request ID for managed execution. Source: [Jupiter Order & Execute](https://developers.jup.ag/docs/swap/order-and-execute).
- Token-detail input is a decoded 32-byte Solana mint before interpolation.
- Wallet discovery uses Wallet Standard through Solana’s React adapter without the legacy wallet bundle. Source: [Solana wallet connection](https://solana.com/developers/cookbook/wallets/connect-wallet-react).
- Walletor referral fees, custody, revenue sharing, and rewards remain unresolved. The current swap does not add or claim a Walletor platform fee.

## Caching and resilience

Public successful responses advertise short shared-cache lifetimes with stale-while-revalidate. Worker upstream calls set bounded timeouts and at most one retry for safe GET requests on retryable statuses. API errors use stable codes, HTTP status, `Retry-After` where known, and request IDs; logs contain no secret or response body.

## Environments

Local uses ignored `.dev.vars`. Preview/staging and production secret bindings are configured separately only when deployment is authorized. No remote or Cloudflare resource exists yet.
