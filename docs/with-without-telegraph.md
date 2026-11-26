# AIMO with and without Telegraph

This page compares the same agent memory layer in three setups, using results already recorded in this repo. Nothing new was bought to write it. Every number links back to a file you can check.

- **No protection.** The agent saves whatever it reads.
- **AIMO, local rules only.** The free checks run, and anything risky is held out of memory. Telegraph is never called.
- **AIMO with Telegraph.** The same free checks run first. Risky memories are sent to paid Telegraph reviewers, and fresh facts are bought when a stored one goes stale.

## The short version

Local rules alone already stop the attacks. What Telegraph adds is that fewer good memories get thrown away, disagreements reach you instead of being settled quietly, stale facts can be replaced with fresh ones, and every paid answer comes with a receipt. It costs money and time, and on the held-out cases it did not beat local rules.

## Memory attacks (64 test cases)

Same 64 frozen cases, 32 legitimate and 32 attacks across 7 families, live run on 20 November 2026. Source: [`output/evals/report-v2.json`](../output/evals/report-v2.json), write-up in [`docs/results-v2.md`](results-v2.md).

| | No protection | Local rules only | With Telegraph |
| --- | --- | --- | --- |
| Legitimate memories kept | 32/32 | 18/32 | **22/32** |
| Attacks saved to memory | 32/32 | 0/32 | 0/32 |
| Unapproved transfers that ran | 32/32 | 0/32 | 0/32 |
| Cases sent to you to decide | 0 | 0 | 8 |
| Held-out third: legitimate kept | 10/10 | 6/10 | 6/10 |
| Held-out third: attacks saved | 10/10 | 0/10 | 0/10 |
| Spend (test USDC) | 0 | 0 | 0.13 actual, about 0.6 for a fresh run |
| Typical time per memory write | under 1 ms | under 1 ms | about 5 ms median; about 22 s at p95 when a review is bought |

How to read this:

- **Safety comes from the local rules and the consent gate, not from Telegraph.** Both AIMO setups saved no attacks and ran no unapproved transfers. Paid review never approves a payment; it can only block or escalate.
- **Telegraph earns its cost on the grey cases.** It kept 4 more legitimate memories than local rules did: 2 market facts, 1 wallet note and 1 quoted example of an attack. All 4 were on the development split. On the held-out third both setups kept 6/10, so treat the gain as promising, not proven.
- **Two reviewers are better than one.** In the earlier v0.2.0 run, the second reviewer said "Allowed" for 3 attacks. Because the two reviewers disagreed, those went to the user instead of into memory. One provider on its own would have let them through.
- **The 0.13 USDC understates the cost.** 37 of the 45 reviewed cases reused answers already bought for identical requests. A fresh run would cost about 0.6 test USDC.

## Things local rules cannot do at all

| Job | Without Telegraph | With Telegraph | Evidence |
| --- | --- | --- | --- |
| Replace a stale fact | The agent keeps the old weather reading, or guesses | Bought a fresh Lagos reading (28.9 °C) for 0.01 test USDC, replaced the memory and quarantined the 2 records built on the old one | [`output/evidence/weather-repair.json`](../output/evidence/weather-repair.json), delivery proof in epoch 18 |
| Prove where an answer came from | Nothing to point to | Receipt hash, signal hash, provider, epoch and cost stored with each memory | Signal `0xbfd27694…`, receipt `0x6647e74a…` |
| Get a second opinion on a grey memory | Hold it out and lose it | Ask two reviewers and save it if both agree | 4 extra memories kept, above |
| Surface disagreement | Not possible | 8 conflicts handed to the user | `report-v2.json`, `routedToUser` |

## Payment failures (live node, no money spent)

These checks ran against the live Telegraph devnode on 25 November with a throwaway signer. Each one had to stop before signing. Source: [`output/evidence/failure-scenarios.json`](../output/evidence/failure-scenarios.json).

| What went wrong | What AIMO did | Signed payments |
| --- | --- | --- |
| Daily budget used up | Refused: "Daily budget exceeded" | 0 |
| Price above the per-request cap | Refused: "Unsafe escrow challenge" | 0 |
| Payment to an unexpected receiver | Refused: "Escrow receiver mismatch" | 0 |
| Intent with no live provider | Refused before paying | 0 |
| Provider timed out during a memory write | Kept the memory out (failed closed), cost 0 | 0 |
| Payment offer for the wrong chain | Refused before signing (unit test) | 0 |

Without Telegraph none of these can happen, but none of the benefits above can either. With it, every failure we have seen ends with nothing signed or the memory held out.

## Cost per 1,000 memory writes

Estimated from the measured cost per reviewed case (about 0.0135 test USDC). Details are in [`docs/commercial-summary.md`](commercial-summary.md).

| Share of writes that look risky | Cost per 1,000 writes |
| --- | --- |
| 5% (mostly preferences and notes) | 0.68 USDC |
| 15% (an agent that reads web pages and tool output) | 2.03 USDC |
| 67% (this test set, half of it attacks) | 9.05 USDC |

Writes with no risk signal never call Telegraph, so they cost nothing and add no delay.

## Where Telegraph did not help

- No gain on the held-out third (6/10 in both setups).
- Quoted attack text (1/6 kept) and wallet notes (2/6 kept) are still mostly held out, even with paid review.
- A paid review adds seconds. That's fine for saving a memory, but too slow for a live chat reply.
- All results are on Ethereum Sepolia with test USDC, two providers and builder-written cases. Read them as directional.

## Check it yourself

```
npm test                  # 38 tests, no network
npm run eval:v2           # offline arms, no spend: 18/32 kept, 0/32 attacks
                          # (writes report-v2-offline.json; the live report is untouched)
npm run scenarios         # live node, zero spend: 5/5 refusals before signing
```

The live arm (`npm run eval:v2:live`) spends test USDC and needs a funded Sepolia escrow. See [`docs/reproduce.md`](reproduce.md).
