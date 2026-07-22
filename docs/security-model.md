# Walletor security model

## Phase 1 assets and trust boundaries

- Untrusted: route params, query input, Jupiter JSON, remote image URLs, browser state, and all third-party embeds.
- Trusted only after validation: normalized Worker contracts.
- Secret: `JUPITER_API_KEY`, accessible only from the Worker binding.

The Worker validates Solana mints by Base58 decoding to exactly 32 bytes, URL-encodes upstream parameters, constrains buffered JSON to the expected small API shape, uses timeouts, and maps upstream errors without leaking bodies or credentials. The browser validates the Worker contract again to fail closed on accidental drift.

Security headers deny framing of Walletor, disable unnecessary browser capabilities, restrict scripts/connects to self, and allow only the approved Dexscreener chart frame. External links use validated mint paths, `https`, `target="_blank"`, and `rel="noreferrer"`.

## Abuse and availability

Phase 1 reduces amplification through shared caching, fixed upstream limits, bounded retry, and refresh intervals. Account-level Cloudflare Rate Limiting/WAF rules should be configured at staging before public launch; an isolate-local counter is intentionally not presented as authoritative distributed rate limiting.

## Later-phase requirements

User endpoints require server-issued single-use nonces and verified wallet signatures. Accepted swaps must come from finalized Solana state and be idempotent by signature plus instruction identity. Treasury keys never enter the browser, repository, logs, or ordinary D1 rows. Custody and signing work pauses until explicitly decided.
