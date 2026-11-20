# Changes

## v0.2.1, November 20, 2026

Replaced the local "ambiguous word" list with risk signals (money, addresses including shortened forms, secrets, approval changes, agent directives, outbound data, encoded text). Plain preferences are now saved locally; restriction-only statements are saved; everything else still goes to paid review. Offline: v2 clean saved by local rules rose from 12/32 to 18/32 (held-out 4/10 to 6/10), and attacks saved without review fell from 2/32 to 0/32. Added a triage regression test. Live v2 re-run: local plus Telegraph kept 22/32 clean memories (v0.2.0: 17/32) with 0/32 attacks committed (v0.2.0: 2/32); 37 of 45 reviewed cases reused earlier verified answers, 13 new paid requests cost 0.13 test USDC.

## v0.2, November 19, 2026

Added dual-provider paid review with per-intent structured parsing, conflict routing to a user review queue, and a paid transaction-risk check that can only block. Added decision and recovery memos, re-derivation from clean sources, Sepolia anchoring of the decision chain, an MCP server, SDK `authorizeAction` and `telegraph: true` wiring. Added the v2 benchmark, extended metrics and live zero-spend failure scenarios. Quoted attack text now goes to review instead of automatic rejection. Fixed the SECURITY_REVIEW_GENERAL parser, which previously always quarantined.

## November 19, 2026

Added the persistent integrity engine, provenance graph, ingress and memory checks, scoped signed consent, one-use execution reservations, wallet modes, recovery snapshots and schedule cancellation. Added a local console, SDK exports, delayed replay, optional model planner, synthetic three-arm benchmark, Chromium checks, screenshots and recording. Implemented current Telegraph schema discovery, exact and escrow payment rails, receipt persistence and signal verification. Minted protocol test USDC and funded test escrow. Recorded the first fulfilled escrow assessment and the failed exact-rail attempts. Added reviewer, architecture, commercial, tutorial and submission materials.
