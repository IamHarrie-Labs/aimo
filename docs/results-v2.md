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
