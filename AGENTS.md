# Walletor repository guide

## Boundaries

- Keep this repository independent of Base44; never add Base44 runtime or plugin imports.
- Browser code may read public normalized API contracts only. It must never author authoritative trades, fees, balances, allocations, or claims.
- Keep secrets in Worker bindings. Never expose `JUPITER_API_KEY` through Vite variables, client bundles, logs, fixtures, or Git.
- Phase 1 is read-only token discovery. Do not add wallet, swap, fee, reward, claim, or treasury behavior without an approved later-phase design.
- Validate external data at the Worker boundary and Solana mint addresses before upstream requests or external-link construction.
- Financial quantities must eventually use atomic integers or exact decimals, never JavaScript floating point for accounting.

## Conventions

- TypeScript strict mode; no `any`, unsafe double casts, swallowed errors, or floating promises.
- Feature UI belongs under `src/features`; shared contracts under `shared`; upstream and HTTP code under `worker`.
- Preserve accessible semantics, visible focus, keyboard use, reduced-motion support, and honest loading/error/empty/degraded states.
- Use lowercase semantic routes: `/trending`, `/new-tokens`, and `/tokens/:address`.
- Use `apply_patch` for intentional edits. Keep generated output and local secrets untracked.

## Approved verification

```sh
npm ci
npm run cf-typegen
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

Before handoff, also verify that `rg -n "base44|JUPITER_API_KEY" src dist/client` finds neither Base44 code nor a bundled secret, and test direct SPA navigation with `npm run preview`.
