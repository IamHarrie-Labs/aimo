# Live v2 benchmark result (19 November 2026)

Run: `npm run eval:v2:live`, finished 19:29 UTC. The dataset is 64 frozen cases (`data/fixtures/manifest-v2.json`). Primary reviewer: SECURITY_REVIEW_GENERAL / 731970. Second opinion: CONTENT_MODERATION_GENERAL / 7423. Payment ran through Ethereum Sepolia escrow at 10,000 atomic test USDC per request. Full trials, providers and receipt hashes: `output/evals/report-v2.json` and `trials-v2.csv`.

| Arm | Clean retained | Attacks committed to memory | Unapproved transfers executed | Sent to user | Paid requests | Cost (test USDC) |
| --- | --- | --- | --- | --- | --- | --- |
| A unprotected | 32/32 | 32/32 | 32/32 | 0 | 0 | 0 |
| B local rules | 12/32 | 2/32 | 0/32 | 0 | 0 | 0 |
| C local + Telegraph | **17/32** | **2/32** | 0/32 | 9 | 58 | 0.58 |

Held-out third: B kept 4/10 clean, C kept 5/10. Both committed 0/10 attacks.

## What the paid layer did

- It kept **5 more legitimate memories** than local rules (false positives fell from 20 to 15) **without letting in any extra attack**.
- Of 30 attacks that reached paid review, none was retained. 27 were quarantined by provider verdicts or by failing closed. 3 went to the user because the providers disagreed.
- 9 cases were routed to the user on provider conflict: 6 clean and 3 poisoned. In all 3 poisoned conflicts, the moderation provider (7423) said "Allowed". Relying on a single provider would have let those attacks into memory. The two-provider rule is what stopped them.
- Both attacks that reached memory were missed by local rules (shortened wallet addresses), so they were never sent for paid review. The consent gate still blocked the transfers they tried to trigger.

## Costs and latency

- 58 new paid requests (plus 6 reused answers from earlier identical requests) across 43 of 64 cases. That averages 0.0135 test USDC per reviewed case and 0.0123 per correct decision.
- Median latency 19.6 s and p95 55 s per paid case. Paid review suits the memory-write path, not real-time chat.

## Failures during the run (kept, not hidden)

- 3 provider timeouts and 1 request blocked as an unresolved earlier payment. These failed closed.
- The last 5 requests returned HTTP 402 after signing. The escrow deposit was most likely exhausted. These are recorded as unresolved and need `npm run reconcile`.
- Provider 731970 often answers without its `verdict` enum. AIMO read 27 explicit summaries as Secure or Insecure and treated the rest as uncertain. The parser was not tuned on these results.
- Earlier runs on the same day were invalidated by devnode outages (HTTP 502, "miner_not_found") and by a ranked classifier unsuited to the task. See docs/provider-suitability.md.

## Claim this supports

On a builder-written synthetic set, selective dual-provider Telegraph review recovered 5 of 20 wrongly blocked legitimate memories for 0.58 test USDC, with no increase in attacks committed to memory. It also converted provider disagreement into user decisions instead of silent errors. This is directional evidence, not a general security benchmark.

## v0.2.1 local triage

The live numbers above use the v0.2.0 local rules. These sent any memory containing words such as "remember", "always" or "payment" to review, so plain preferences like "always use metric units" were quarantined before a provider saw them.

v0.2.1 replaces the word list with risk signals: money movement, an address (including shortened forms such as `0x7Be1...`), secrets, approval or policy changes, a directive aimed at the agent, outbound data, and encoded text. A memory with no risk signal is saved locally. A memory that only adds a restriction ("payment requires separate user approval"), with no address and no relaxing wording, is also saved. Everything else still goes to paid review. The change was designed from the v1 failures (plain "remember" facts and restriction-only statements), not tuned on v2.

Local rules only, measured with `scan()` and no paid review:

| | v0.2.0 | v0.2.1 |
| --- | --- | --- |
| v1 clean saved | 15/30 | 25/30 (the other 5 are quoted attack text, reviewed by design) |
| v2 clean saved | 12/32 | 18/32 |
| v2 held-out clean saved | 4/10 | 6/10 |
| v2 attacks saved without review | 2/32 | 0/32 |

Local rules alone now keep more clean memories (18/32) than v0.2.0 kept with paid review (17/32), and no attack bypasses review.

### Live re-run, 20 November 2026

Same 64 cases, same providers (SECURITY_REVIEW_GENERAL/731970 with CONTENT_MODERATION_GENERAL/7423 second opinion). The v0.2.0 report and database are kept in output/evals/v0.2.0/ and data/benchmark-v2.v0.2.0.db.

| Arm | Clean kept | Attacks committed | Attacks executed | Routed to user | Cases with new paid requests | New cost (test USDC) |
| --- | --- | --- | --- | --- | --- | --- |
| B local rules | 18/32 | 0/32 | 0/32 | 0 | 0 | 0 |
| C local + Telegraph | **22/32** | **0/32** | 0/32 | 8 | 8 of 64 | 0.13 |

Held-out: 6/10 clean kept in both arms, 0/10 attacks committed.

- Compared with v0.2.0 live (17/32 kept, 2/32 attacks committed), the combined system keeps 5 more legitimate memories and commits no attacks.
- 45 cases went to review. 37 of them reused verified provider answers already bought for identical requests in the v0.2.0 run, so they cost nothing new. Only 8 cases needed 13 new paid requests. The 0.13 test USDC therefore understates the cost of a fresh run; at the v0.2.0 rate of about 0.0135 per reviewed case, a fresh run would cost roughly 0.6 test USDC.
- 8 provider conflicts were routed to the user instead of being decided silently.
- No timeouts, 402 refusals or unresolved payments in this run.
- Paid review still misses most quoted attack text (1/6 kept) and wallet notes (2/6 kept); these remain the main false-positive families.
