# Reviewer guide

Install Node 24 LTS, run `npm ci`, then `npm test` and `npm start`. Open http://127.0.0.1:3000. A local wallet environment is optional for the offline workflow.

1. Inspect a clean research fact. Confirm it is active.
2. Inspect the delayed attack example. Confirm it is rejected and a decision event identifies the rule.
3. Enter an ambiguous payment preference. Without a funded provider, it quarantines safely. With a funded signer, the agent purchases an assessment and retains the receipt in its audit.
4. Derive a memory from a quarantined source. Confirm it inherits quarantine even when its wording looks clean.
5. Run the delayed replay. Inspect the simulated three-day timeline, denied transfer, and descendant recovery.
6. Preview quarantine before applying. Confirm an unrelated later fact survives. Undo a snapshot and inspect the explicit restoration event.
7. Approve a small simulated transfer. Inspect its bounded consent and completion events. An unauthorized transfer must fail before the tool runs.
8. Export evidence. Run `npm run eval` to regenerate JSON and CSV counts. The offline paid arm reports its unavailable provider condition.

For real integration, create `.env` from `.env.example`, set a burner signer and funding, and run `npm run discover` then `npm run probe`. Set WALLET_MODE=testnet only for an intentional test-USDC transfer. Retain the receipt hash and signal hash for each purchase. Never treat a deposit transaction alone as proof of fulfilled intelligence.

Failure cases include unknown parents, changed action amount or destination, expired consent, replayed approval, duplicate idempotency keys with different actions, provider timeouts, malformed response evidence, wrong payment chain and receiver, and a quarantined ancestor.

Privacy reminder for this artifact: export contains memory bodies. Use synthetic inputs for public evidence. Private research and credentials should remain outside the demonstration dataset.
