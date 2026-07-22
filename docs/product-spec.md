# Walletor Phase 1 product specification

## Goal

Walletor is a responsive Solana token-intelligence dashboard. Phase 1 gives anyone a fast, honest way to discover trending and newly listed tokens, inspect normalized market data, and continue to trusted third-party research tools.

## Users and jobs

- A market watcher scans ranked tokens, searches by name/symbol/mint, and sorts meaningful metrics.
- An early-token researcher scans Jupiter’s recent first-pool feed and sees listing age and liquidity without a misleading fallback pretending unrelated tokens are new.
- A researcher opens `/tokens/:address`, reads current metrics, views a Dexscreener chart, copies the mint, and opens Dexscreener or Solscan.

## Phase 1 behavior

- Routes: `/trending`, `/new-tokens`, `/tokens/:address`; `/` redirects to `/trending`.
- Data refreshes in the background on a conservative cadence and always shows source/freshness metadata.
- Initial loading, refresh, empty, malformed-address, missing-secret, upstream-rate-limit, upstream-failure, and stale/degraded states are explicit.
- Third-party images may fail without breaking identity; initials are the fallback.
- The shell uses the established dark navy, mint (`#00ffa3`), and cyan identity, with responsive navigation and accessible contrast/focus.

## Explicitly absent

Wallet connection, swaps, fees, pool balances, smart-wallet rankings, rewards, and claims are later phases. No placeholder may imply those systems exist. A small “Discovery only” status explains the current boundary.

## Success criteria

The three public routes operate through `/api`, direct navigation works under Cloudflare SPA fallback, secrets remain server-only, contract boundaries are runtime-validated, and automated checks cover UI and Worker success/failure paths.
