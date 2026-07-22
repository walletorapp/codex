# Walletor data model

## Phase 1

No database is required. `TokenSummary` and `TokenDetail` are transient normalized market-data contracts. They include only public market metadata plus source/freshness information; they are not an accounting record.

## Proposed later-phase relational model

This proposal is intentionally unimplemented pending the decision register.

- `wallet_nonces`: nonce hash, public key, expiry, used-at; unique and single-use.
- `wallet_sessions`: hashed token, wallet id, issued/expiry/revoked timestamps.
- `wallets`: canonical public key and timestamps.
- `verified_transactions`: signature, slot, block time, finality, verification source/version; unique signature.
- `verified_swaps`: transaction id, instruction identity, input/output mints, atomic integer amounts, decimals, notional provenance, fee mint/account/atomic amount; unique transaction + instruction.
- `ledger_accounts` and append-only `ledger_entries`: balanced transaction groups, atomic amount, asset mint, provenance; corrections are compensating groups.
- `reward_epochs`: immutable eligibility window and state transitions.
- `reward_allocations`: epoch + wallet uniqueness, atomic allocation, formula version, snapshot provenance.
- `reward_claims`: allocation uniqueness, payout asset/amount, transaction identity, explicit state.
- `smart_wallet_snapshots`: provider, methodology version, observed-at, immutable metrics.
- `indexer_checkpoints` and `audit_events`: replay/provenance and operational trace.

All relations need foreign keys, checks, query indexes, immutable-state guards, and integer/string exact-value boundaries. Final schemas wait for fee asset, custody, allocation, payout, finality, compliance, and provider decisions.
