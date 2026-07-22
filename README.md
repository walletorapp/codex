# Walletor

Walletor is a production-oriented Solana token-intelligence dashboard. This repository is the independent Phase 1 rebuild: trending discovery, a new-token radar, and token detail pages backed by a same-origin Cloudflare Worker API.

The release is intentionally read-only. It does **not** connect wallets, execute swaps, collect fees, show a revenue pool, calculate rewards, or process claims.

## Stack

- React 19, React Router, TanStack Query, strict TypeScript, and Vite
- Cloudflare Workers Static Assets plus an integrated Hono `/api/*` Worker
- Birdeye market data, normalized and runtime-validated with Zod
- Vitest, React Testing Library, and Playwright

No Base44 runtime, plugin, account, or service is required.

## Local setup

Requirements: Node.js 22.12 or newer and a Birdeye API key with access to the endpoints used by your plan.

```sh
npm ci
cp .dev.vars.example .dev.vars
```

Set the server-only value in `.dev.vars`:

```text
BIRDEYE_API_KEY=your-local-key
```

Then start the Worker-backed Vite development server:

```sh
npm run dev
```

The browser never receives this key. A missing/empty key produces an explicit “market data is not configured” state.

## Routes and API

| UI                 | Worker API                 |
| ------------------ | -------------------------- |
| `/trending`        | `GET /api/tokens/trending` |
| `/new-tokens`      | `GET /api/tokens/new`      |
| `/tokens/:address` | `GET /api/tokens/:address` |
| —                  | `GET /api/health`          |

The Worker validates token mints, applies upstream timeouts and a bounded safe retry, normalizes untrusted JSON, emits short shared-cache policies, and returns typed errors. The current listing route uses Birdeye `/defi/v2/tokens/new_listing`; it does not disguise a generic token-list fallback as new listings.

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

Playwright exercises desktop and mobile navigation, all three public routes, and Cloudflare SPA deep-link behavior with deterministic API interception. Worker tests cover health, normalization, secret absence, current endpoint selection, caching headers, and pre-upstream mint rejection.

## Configuration and deployment

- `.dev.vars` is ignored; `.dev.vars.example` contains the required name only.
- `wrangler.jsonc` uses the current compatibility date, generated bindings, `/api/*` Worker-first routing, SPA fallback, and structured observability settings.
- No D1 binding exists because Phase 1 has no relational state.
- No GitHub remote, Cloudflare resource, deployment, domain, or paid service is created by this phase.
- Configure staging/production secrets separately with Wrangler only after account and deployment ownership are approved.

The npm advisory report currently flags a high-severity `sharp <0.35.0` advisory through local-only Cloudflare development tooling (`miniflare`/`wrangler`). As of this build, npm offers no non-breaking fixed current release; production browser and Worker dependencies are not in that path. Recheck before publishing rather than applying npm’s suggested downgrade/force fix.

## Architecture and decisions

Start with [the product spec](docs/product-spec.md), [architecture](docs/architecture.md), [security model](docs/security-model.md), and [decision log](docs/decisions.md). The proposed later-phase financial data model is documented but deliberately unimplemented.

Before swaps or rewards, product owners must decide the fee mechanism, custody, allocation formula, payout model, finality/reorg policy, geography/compliance, smart-wallet methodology, providers, and administrative controls. Those choices are not implementation details and are never inferred by this codebase.
