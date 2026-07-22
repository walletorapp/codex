# Decision log

## Accepted for Phase 1

1. One strict TypeScript repository with React 19, Vite, Cloudflare’s Vite plugin, and a Hono Worker.
2. No D1 in Phase 1 because public market discovery has no relational state.
3. Birdeye is the only market-data source; lack of credentials or upstream failure is displayed, never replaced with misleading generated data.
4. The normalized API is smaller than Birdeye’s raw response and runtime-validated on both sides.
5. The recognizable navy/mint/cyan identity stays; fake financial modules and inactive wallet/trade controls are absent.
6. Dexscreener is a user-initiated chart panel and external research link; Solscan is the explorer link.
7. Local Git may be initialized after all checks. No GitHub remote or Cloudflare mutation is authorized.

## Deferred product decisions

Fee mechanism/asset/account, custody, allocation formula, payout model, finality/reorg policy, geography/compliance, smart-wallet methodology, Birdeye production plan, Solana RPC, authentication scope, admin roles, observability vendors, final branding/domain/support, repository ownership/visibility, and Cloudflare account/environment ownership remain unresolved.

These choices block swaps, financial ledger work, rewards, claims, smart-wallet scoring, publishing, and deployment. See the handoff `DECISION_REGISTER.md` for full decision prompts.
