# Walletor architecture

## Phase 1 shape

```text
React SPA (Vite, React Router, TanStack Query)
  -> same-origin /api client
  -> Hono Worker
       -> request/address validation
       -> Birdeye adapter (timeout, one safe retry, response validation)
       -> normalized shared contracts + cache/error headers
  -> Cloudflare Workers Static Assets (SPA fallback)
```

The browser and API are one deployable Worker project. `assets.run_worker_first` scopes execution to `/api/*`; missing client routes fall back to `index.html`. No persistence is needed for read-only discovery, so Phase 1 intentionally creates no D1 binding or unused migration.

## Current-source decisions (checked 2026-07-22)

- Cloudflare recommends Workers Static Assets for new full-stack/SPAs and its Vite plugin for local `workerd` parity. SPA routing uses `assets.not_found_handling: "single-page-application"`. Sources: [React + Vite](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/), [Vite plugin static assets](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/), [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
- Birdeye stays behind the Worker. Trending uses `/defi/token_trending`; new listings use the current `/defi/v2/tokens/new_listing` endpoint rather than the legacy path. Source: [Birdeye trending](https://docs.birdeye.so/reference/get-defi-token_trending), [Birdeye new listing](https://docs.birdeye.so/reference/get-defi-v2-tokens-new_listing).
- Token detail uses `/defi/token_overview`; input is a decoded 32-byte Solana mint before interpolation.
- A later wallet phase should use Wallet Standard discovery. Solana’s current React guidance warns against the legacy adapter bundle unless its specific protocol support is required. Source: [Solana wallet connection](https://solana.com/developers/cookbook/wallets/connect-wallet-react).
- Jupiter fee/custody behavior remains an unresolved later-phase decision; no Jupiter SDK or link implying in-app execution is included now.

## Caching and resilience

Public successful responses advertise short shared-cache lifetimes with stale-while-revalidate. Worker upstream calls set bounded timeouts and at most one retry for safe GET requests on retryable statuses. API errors use stable codes, HTTP status, `Retry-After` where known, and request IDs; logs contain no secret or response body.

## Environments

Local uses ignored `.dev.vars`. Preview/staging and production secret bindings are configured separately only when deployment is authorized. No remote or Cloudflare resource exists in Phase 1.
