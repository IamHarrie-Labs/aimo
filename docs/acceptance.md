# Acceptance checklist

Status for v0.2.2 plus the 26 November updates (wider address detection, with/without Telegraph comparison). Each row says where the evidence is, so a judge can check it without asking. Last updated 26 November 2026.

## Mission 09 requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| A useful personal-agent task completed with an autonomous Telegraph purchase | Done, live | `npm run weather:repair -- Lagos`: a stale weather memory is replaced using a paid WEATHER_CHECK_TEMPERATURE answer, and the memories built on the stale one are quarantined. Receipt, provider, epoch and cost are in `output/evidence/weather-repair.json`. |
| Stale answer handled | Tested | `weather-repair.test.mjs`: a stale or missing paid result keeps the old memory and writes nothing new. The live path rejects observations older than 10 minutes. |
| No budget | Tested | `scenarios.test.mjs`: "no budget refuses before any payment is attempted". |
| Failed payment | Tested | `scenarios.test.mjs`: refusals before signing release the budget; failures after signing are marked unresolved and never retried automatically (`npm run reconcile`). |
| Conflicting provider answers | Tested and measured live | `scenarios.test.mjs`: "conflicting provider answers are routed to the user". 8 live conflicts went to the user in the v0.2.1 run. |
| Chain mismatch | Tested | `scenarios.test.mjs`: "payment challenges for the wrong chain are refused before signing". |
| Cost per useful outcome | Measured | `docs/results-v2.md`: 0.0135 test USDC per reviewed case and 0.0123 per correct decision (v0.2.0, all answers bought fresh). Cost per 1,000 memory writes is in `docs/commercial-summary.md`. |

## How AIMO works

| Requirement | Status | Evidence |
| --- | --- | --- |
| Three checkpoints (reading, saving, acting) | Done | `engine.mjs`: `inspectRetrieved`, `proposeMemory`, `authorizeAction`. |
| Provenance on every memory | Done | SQLite records keep source and parent ids, trust level, timestamps, hashes and versions. |
| Paid review only when needed | Done | Local triage first. Plain preferences are saved for free; memories touching money, addresses, secrets or approvals get paid review, with a second opinion when the first is unsure or risky. |
| Memory can never approve a payment | Tested | One-use signed approval scoped to the exact amount, recipient and resource. "paid risk check can block but never authorise an external effect". |
| Recovery | Tested | Selective quarantine of descendants, dependent schedules turned off, snapshots, undo and version restore (`engine.test.mjs`, `npm run replay`). |
| Receipts | Done | Receipt hash, signal hash, provider, epoch, amount and response hash are stored per purchase. One delivery proof is published in `output/evidence/epoch-deliveries.json`. |
| Payee addresses on any chain | Tested | EVM, Bitcoin and Solana addresses, full or shortened (`7xKX...AsU`), always trigger review and count as high stakes (`address.mjs`, `engine.test.mjs`). |
| Spend limits | Done | Per-review and daily caps, reserved before signing (`MAX_REVIEW_UUSDC`, `DAILY_REVIEW_UUSDC`). |

## Evaluation

| Item | Result |
| --- | --- |
| Dataset | 64 frozen synthetic cases (32 legitimate, 32 attacks across 7 families), written by the builder. Hash in `output/evals/report-v2.json`. |
| No protection | 32/32 attacks saved to memory. |
| Local rules only | 18/32 legitimate kept, 0/32 attacks saved. |
| Local + Telegraph review | 22/32 legitimate kept, 0/32 attacks saved, 0 unapproved transfers, 8 conflicts sent to the user. |
| What paid review added | 4 more legitimate memories than local rules alone, all on the development split. On the held-out third both arms kept 6/10. |
| Cost | The v0.2.1 rerun spent 0.13 test USDC because it reused 37 earlier verified answers. A fresh run would cost an estimated 0.6 test USDC. |
| Repeatability | The local arm gives identical counts on repeated runs (tested in CI). Offline runs write to `report-v2-offline.json`, so they never overwrite the live report. |
| With vs without Telegraph | Side by side in `docs/with-without-telegraph.md`: attacks, legitimate memories kept, conflicts, cost, latency and payment failures for no protection, local rules only, and local rules plus Telegraph. |
| Limits | Builder-written cases, Sepolia only, two providers. Treat results as directional. Details in `docs/results-v2.md`. |

## Developer use

| Item | Status | Evidence |
| --- | --- | --- |
| Tests in CI | Passing | 38 tests on every push: https://github.com/IamHarrie-Labs/aimo/actions |
| Installable SDK | Done | `npm i github:IamHarrie-Labs/aimo` (about 32 kB, 14 files). CI installs the packed SDK into a clean folder on every push. |
| MCP server | Done | `aimo-mcp` binary, covered by `mcp.test.mjs`. |
| Docs | Done | README, `docs/tutorial.md`, `docs/reproduce.md`, `docs/architecture.md`, `docs/reviewer-guide.md`, `docs/mainnet-readiness.md`. |
| Public site | Live | https://aimo-one.vercel.app/ with a recorded walkthrough. It makes no live purchases. |

## Still open

| Item | Status |
| --- | --- |
| Outside developer reproduction | Not yet. `docs/reproduce.md` and the "Reproduction report" issue template are ready for one. |
| Repeat use by an outside developer | Not yet. |
| Public updates | 1 of 3 posted (21 November): https://x.com/IamHarrie/status/2124273746206990832 |
| Mission progress | `/claim` and first `/progress` posted on telegraphprotocol/bounties#197. |
| Mainnet | Not ready. See `docs/mainnet-readiness.md`. |
| Final submission | Due 1 December 2026, 23:59 UTC. |
