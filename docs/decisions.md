# Decision log

## Accepted

1. One strict TypeScript repository with React 19, Vite, Cloudflare’s Vite plugin, and a Hono Worker.
2. No D1 because swaps execute through Jupiter and Walletor does not yet author financial state.
3. Jupiter Tokens V2 is the only market-data source; lack of credentials or upstream failure is displayed, never replaced with misleading generated data.
4. The normalized API is smaller than Jupiter’s raw response and runtime-validated on both sides.
5. The recognizable dark/mint/cyan identity stays; demo revenue figures are labeled and fake financial success behavior is forbidden.
6. Dexscreener is a user-initiated chart panel and external research link; Solscan is the explorer link.
7. Local Git may be initialized after all checks. No GitHub remote or Cloudflare mutation is authorized.
8. The DEX uses Jupiter Swap V2 order/execute without a Walletor referral fee. Wallet confirmation is mandatory and demo metrics cannot enter accounting.

## Deferred product decisions

Fee mechanism/asset/account, custody, allocation formula, payout model, finality/reorg policy, geography/compliance, smart-wallet methodology, Jupiter production plan, Solana RPC, authentication scope, admin roles, observability vendors, final branding/domain/support, repository ownership/visibility, and Cloudflare account/environment ownership remain unresolved.

These choices block Walletor fee collection, financial ledger work, rewards, claims, smart-wallet scoring, publishing, and deployment. See the handoff `DECISION_REGISTER.md` for full decision prompts.
