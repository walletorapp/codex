# Walletor product specification

## Goal

Walletor is a responsive Solana DEX and token-intelligence dashboard. It gives traders a Jupiter-powered swap surface plus fast, honest token discovery and research tools.

## Users and jobs

- A market watcher scans ranked tokens, searches by name/symbol/mint, and sorts meaningful metrics.
- An early-token researcher scans Jupiter’s recent first-pool feed and sees listing age and liquidity without a misleading fallback pretending unrelated tokens are new.
- A researcher opens `/tokens/:address`, reads current metrics, views a Dexscreener chart, copies the mint, and opens Dexscreener or Solscan.
- A trader connects a Wallet Standard wallet, receives a live Jupiter quote, reviews the wallet transaction, signs it, and sees success only after Jupiter reports confirmed execution.

## Current behavior

- Routes: `/swap`, `/trending`, `/new-tokens`, `/tokens/:address`; `/` redirects to `/swap`.
- Data refreshes in the background on a conservative cadence and always shows source/freshness metadata.
- Initial loading, refresh, empty, malformed-address, missing-secret, upstream-rate-limit, upstream-failure, and stale/degraded states are explicit.
- Third-party images may fail without breaking identity; initials are the fallback.
- The shell uses the established dark navy, mint (`#00ffa3`), and cyan identity, with responsive navigation and accessible contrast/focus.

## Explicitly absent

Walletor fees, authoritative pool balances, smart-wallet rankings, rewards, and claims are absent. Demo pool figures are labeled visual-only. The browser never creates a trade record or declares a swap successful without Jupiter confirmation.

## Success criteria

Swap and discovery routes operate through `/api`, direct navigation works under Cloudflare SPA fallback, secrets remain server-only, contract boundaries are runtime-validated, and automated checks cover UI and Worker success/failure paths.
