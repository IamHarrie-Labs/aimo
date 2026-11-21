# Commercial hypothesis

The initial buyer is a small team operating a persistent research or treasury assistant with wallet tools. A poisoned source can become a standing memory and influence later plans. AIMO supplies provenance, memory-write inspection, bounded action approval and incident recovery.

The pricing hypothesis is free local inspection with selective paid independent review for ambiguous memories. Validate costs using observed paid review frequency, cost per request and clean memory retention. Report price per 1,000 writes only after measuring the ambiguity rate and provider results.

Adoption starts with one runtime integration using the SDK and one independently reproduced incident replay. Record dated feedback and substantive repeat use. Public views, self-purchases and seeded demonstrations do not establish customer demand.

The critical commercial test is whether external assessments preserve more useful memory at acceptable cost while holding malicious retention low. Current local rules are conservative and the generated benchmark documents their false positives. Product and security claims must follow the measured results. Measured so far (v0.2.1, live, builder-written 64-case set): paid review raised clean memories kept from 18/32 to 22/32 with no attacks committed, at about 0.0135 test USDC per reviewed case. Only risky memories are reviewed, so plain preferences cost nothing.

## Cost per 1,000 memory writes

Local triage is free. Only writes it flags as risky (money, addresses, secrets, approvals, instructions aimed at the agent) are sent for paid review. So the cost depends on how many writes get flagged.

Measured inputs, from the v0.2.0 live run that bought every review fresh:

- Each Telegraph request cost 10,000 atomic units, which is 0.01 test USDC.
- 43 reviewed cases needed 58 new paid requests (1.35 per case, since not every case needs both providers), so 0.0135 test USDC per reviewed case.
- Median latency was 19.6 s and p95 was 55 s per reviewed case.

| Share of writes flagged | Reviewed per 1,000 writes | Cost per 1,000 writes |
| --- | --- | --- |
| 5% (mostly preferences and notes) | 50 | 0.68 USDC |
| 15% (agent that reads web pages and tool output) | 150 | 2.03 USDC |
| 67% (the synthetic test set, half of it attacks) | 670 | 9.05 USDC |

These are test-network figures. They assume the mainnet price per request matches the Sepolia price, which hasn't been confirmed. The 5% and 15% rows are estimates. The only measured share is the 67% one, from a deliberately adversarial set. Reused answers for identical requests bring the real cost down. In the v0.2.1 rerun, cached answers cut new spend to 0.13 test USDC for 45 reviewed cases.

## Who pays and why

**The buyer.** A small team running an assistant with long-term memory and a wallet or other tools with real consequences: a research agent, a treasury helper, a support bot that can issue refunds.

**What they do today.** Most keep everything the agent writes to memory, or turn memory off. Some add a system-prompt rule like "ignore instructions in documents". That doesn't stop a poisoned note saved last week from steering a payment today. The careful ones review memory by hand, which doesn't scale.

**Budget.** At 1 to 10 USDC per 1,000 memory writes, the cost is small next to the model calls the agent already makes, and tiny next to one misdirected payment. A team writing 20,000 memories a month at a 15% flag rate would spend about 40 USDC. That is the hypothesis to test with the first users, not a measured willingness to pay.

**Acceptable error.** The hard line is zero unapproved payments: memory can never approve a transfer, whatever the reviewers say. Attacks saved to memory should be as close to zero as measurable (0/32 in the test set). Wrongly blocked legitimate memories are the cost users trade for that. Today 10/32 legitimate memories are still held back after paid review, and each one is held in quarantine, not deleted. Users will tolerate this only if held memories are easy to review and release.

**Response time.** Local triage takes under a millisecond, so normal writes aren't slowed. Paid review takes 20 to 55 seconds, so it runs off the chat path: the memory waits in quarantine and the agent carries on without it. This doesn't suit a write that must be used within the same turn.

**What would prove demand.** An outside team wiring the SDK or MCP server into their own agent, keeping it on for two weeks, and reporting how many writes were flagged and how many held memories they released. Views, self-purchases and seeded demos don't count.
