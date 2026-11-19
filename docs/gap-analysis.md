# Gap analysis against the plan, spec and mission rules

Sources checked on 19 November 2026: `AIMO_Plan.pdf` (18 Nov), `AIMO_build_spec.pdf` v1.0 (18 Nov), the Personal Agent mission (telegraphprotocol/bounties issue 197), the live intent catalogue at devnode.telegraphprotocol.com, and this repository.

## The root cause

The paid review used `LLM_OUTPUT_EVALUATION_GENERAL` provider 76441. Its answers lack the structured rating/score/errors fields, so AIMO could never act on them. Every paid case fell back to quarantine. The paid arm therefore equalled the local arm, and the project reported "no measured paid uplift".

Two further problems hid this:

- Every non-classification response was parsed with the rating/score check, including `SECURITY_REVIEW_GENERAL`, the intent the plan specified. It would always have quarantined.
- The v1 benchmark (60 templated cases) is almost entirely sorted by the local regex rules. Only 15 cases ever reached paid review, so the paid check had little room to show value.

The live catalogue has structured alternatives. `TEXT_CLASSIFICATION_GENERAL` (20 providers) returns `category` + `confidence`. `SECURITY_REVIEW_GENERAL` (33 providers) returns a `Secure / Needs changes / Insecure` enum. `TRANSACTION_RISK_GENERAL` (15 providers) returns `LOW…CRITICAL`.

## Requirement checklist

| Requirement (source) | Before | Now |
| --- | --- | --- |
| Selective paid check on ambiguous cases (Plan 2.1.4) | One unstructured provider, always quarantined | Structured classifier, verdict parsed per intent (`telegraph.mjs` `interpretResult`) |
| Second opinion from a different provider when uncertain or high stakes (Plan 4.3.4) | Missing | `reviewer.mjs`: second opinion from `SECURITY_REVIEW_GENERAL` when the first is uncertain or allows high-stakes text |
| Conflicting provider answer (Mission 09 tests) | Missing | Conflict → `REVIEW`, kept out of memory, shown in the console's "Waiting for your decision" queue |
| Ambiguous action routed to user / paid action check (Plan 4.1, Spec 4.4) | Consent only | Paid `TRANSACTION_RISK_GENERAL` before memory-influenced or large transfers. It can only block. Re-approval with `riskAccepted` |
| Memo for every verdict (Plan 4.4) | Missing | `decisionMemo` stored on each record and audit event |
| Chain head anchored on Sepolia (Plan 4.4) | Missing | `npm run anchor` / `npm run anchor:verify <tx>` |
| Recovery memo; re-derive from clean sources (Plan 4.5, Spec 4.5) | Quarantine only | `recoveryReport` lists removed, kept, receipts and re-derivable memories; `engine.rederive()` |
| Benign quoted instructions not auto-rejected (Spec 6) | 5 clean quoted cases rejected | Quoted attack text goes to paid review instead |
| 7 attack classes, benign controls, held-out split (Spec 6) | 60 templated cases, 2 families dominated | v2: 64 hand-written cases, 7 attack and 5 benign classes, deterministic held-out third |
| Metrics: recall, attack success, cost per decision, p95 (Spec 6) | Partial | Added to `benchmark.mjs`, plus per-family and held-out breakdowns |
| No budget / failed payment / missing provider tests (Mission 09) | Unit tests only | `npm run scenarios`: live node, throwaway key, zero spend, 5/5 pass |
| SDK `authorizeAction` + MCP integration (Spec 7, Plan 2.1.8) | `execute` only, no MCP | `createAimo({telegraph:true})`, `authorizeAction`, stdio MCP server `npm run mcp` |

## Live result

The live v2 run is done; see docs/results-v2.md. Paid review kept 17/32 clean memories against 12/32 for local rules, with the same 2/32 attacks committed (both missed locally and never reviewed). It routed 9 provider conflicts to the user and cost 0.58 test USDC. The first ranked classifier was unsuitable and the devnode had outages; both are documented in docs/provider-suitability.md.

Escrow was topped up with 1 test USDC on 19 November (output/evidence/escrow-funding.json). `npm run reconcile` released the 5 post-signature 402 refusals and 29 pre-signature failures as unpaid. It left 10 payments as unknown (timeouts or dropped connections after signing; see output/evidence/unresolved-payments.json). Of 99 verified receipts, 28 already have epoch delivery proofs and 71 wait for epoch settlement. Remaining live step: record one demo with a provider conflict.

## Still open: needs you (account and public actions)

Scored items that code cannot produce:

- **Growth (20 points):** three original updates on separate dates tagging @Telegraphprotoc; one tutorial (docs/tutorial.md is the draft); a quick-start; a specific invitation for outside developers to try the MCP server or replay.
- **Independent adoption (10 points):** at least one outside developer installs and runs it, evidenced by a GitHub issue, PR or reproduction report.
- **Entry requirements:** star telegraphprotocol/bounties; `/claim` on issue 197 and `/progress` at least every 72 hours; public repository with a tagged release; final Anjoman Season II form before 1 December 23:59 UTC; consider listing on Anjoman Apps.
- **Demo video:** 2–5 minutes covering the problem, Telegraph request, provider evidence, cost, completed result and how to try it.

## Known limits to state openly

- v2 fixtures are written by the builder. They are directional, not an independent benchmark.
- Local rules let 2 of 32 v2 attacks into memory (addresses written in shortened form). The consent gate still blocks the resulting transfers. The rules were not tuned to v2.
- Provider answers can change between runs. Every paid opinion records its provider and receipt.
