# Legacy-to-rebuild migration map

| Legacy behavior                                             | Current disposition                               | Reason                                             |
| ----------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Base44 trending function                                    | Rewritten as validated Worker GET endpoint        | Remove Base44 and keep key server-side             |
| Base44 Birdeye new-listing endpoint + generic-list fallback | Jupiter recent first-pool endpoint; fail honestly | Unrelated high-volume tokens are not “new”         |
| Query-string token detail                                   | `/tokens/:address`                                | Semantic, shareable route with early validation    |
| Inline styling                                              | Design tokens and responsive CSS                  | Accessibility and maintainability                  |
| 10–15 second polling                                        | Conservative query freshness/background refresh   | Respect plan limits and cache behavior             |
| Swallowed fetch failures                                    | Typed visible errors with retry                   | Honest degraded state                              |
| Injected wallet globals                                     | Wallet Standard discovery                         | Restore sessions/events through supported adapters |
| Jupiter terminal/manual swap                                | Jupiter Swap V2 order/sign/execute                | Confirm through Jupiter; remove fake success path  |
| Hard-coded pool/trader/distribution values                  | Visible demo-only presentation                    | Never present simulated values as accounting       |
| Browser-authored trades/reward updates                      | Removed                                           | Browser cannot author authoritative finance state  |
| Missing SmartWallet entities/indexer                        | Removed                                           | No provider or methodology selected                |

The legacy directory remains read-only and is not a build dependency.
