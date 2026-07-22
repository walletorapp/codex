# Walletor

Walletor is an independent rebuild of the legacy Base44 app. It restores the DEX-first Walletor experience: live Jupiter swaps on Solana, Wallet Standard connection, and token discovery backed by a same-origin Cloudflare Worker API.

The swap flow uses Jupiter Swap V2: the Worker prepares an order, the user reviews and signs it in their wallet, and Jupiter reports the confirmed execution. Revenue-pool, payout, trader, reward, and distribution figures are explicitly demo visuals; this release does not collect a Walletor fee or claim reward accounting.

## Stack

- React 19, React Router, TanStack Query, strict TypeScript, and Vite
- Cloudflare Workers Static Assets plus an integrated Hono `/api/*` Worker
- Jupiter Tokens V2 market data, normalized and runtime-validated with Zod
- Jupiter Swap V2 order/execute with Wallet Standard discovery
- Vitest, React Testing Library, and Playwright

No Base44 runtime, plugin, account, or service is required.

## Local setup

Requirements: Node.js 22.12 or newer and a Jupiter developer API key.

```sh
npm ci
cp .dev.vars.example .dev.vars
```

Set the server-only value in `.dev.vars`:

```text
JUPITER_API_KEY=your-local-key
```

Then start the Worker-backed Vite development server:

```sh
npm run dev
```

The browser never receives this key. A missing/empty key produces an explicit “market data is not configured” state.

## Routes and API

| UI                 | Worker API                 |
| ------------------ | -------------------------- |
| `/swap`            | `GET /api/swap/order`      |
| —                  | `POST /api/swap/execute`   |
| `/trending`        | `GET /api/tokens/trending` |
| `/new-tokens`      | `GET /api/tokens/new`      |
| `/tokens/:address` | `GET /api/tokens/:address` |
| —                  | `GET /api/health`          |

The Worker validates token mints, applies upstream timeouts and a bounded safe retry, normalizes untrusted JSON, emits short shared-cache policies, and returns typed errors. Trending uses Jupiter Tokens V2 `toptrending/24h`, new listings use the `recent` first-pool feed, and token detail uses exact mint search.

## Verification

```sh
npm run cf-typegen
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium # first machine setup only
npm run test:e2e
```

Playwright exercises the DEX quote interface, desktop/mobile navigation, discovery routes, and Cloudflare SPA deep-link behavior with deterministic API interception. Worker tests cover swap order/execute boundaries, health, normalization, secret absence, caching, and pre-upstream validation.

## Configuration and deployment

- `.dev.vars` is ignored; `.dev.vars.example` contains the required name only.
- `wrangler.jsonc` uses the current compatibility date, generated bindings, `/api/*` Worker-first routing, SPA fallback, and structured observability settings.
- No D1 binding exists because the app does not author trade, fee, or reward records.
- No GitHub remote, Cloudflare resource, deployment, domain, or paid service is created by this phase.
- Configure staging/production secrets separately with Wrangler only after account and deployment ownership are approved.

The npm advisory report currently flags a high-severity `sharp <0.35.0` advisory through local-only Cloudflare development tooling (`miniflare`/`wrangler`). As of this build, npm offers no non-breaking fixed current release; production browser and Worker dependencies are not in that path. Recheck before publishing rather than applying npm’s suggested downgrade/force fix.

## Architecture and decisions

Start with [the product spec](docs/product-spec.md), [architecture](docs/architecture.md), [security model](docs/security-model.md), and [decision log](docs/decisions.md). The proposed financial data model is documented but deliberately unimplemented.

Before Walletor fees or rewards, product owners must decide the fee mechanism, custody, allocation formula, payout model, finality/reorg policy, geography/compliance, smart-wallet methodology, providers, and administrative controls. Those choices are not implementation details and are never inferred by this codebase.
