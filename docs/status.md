# Build evidence

The implementation includes SQLite persistence, provenance inheritance, three boundaries, one-use HMAC approvals, idempotent action execution, testnet token tools, direct x402 and escrow clients, receipt storage, signal hashing, selective quarantine, reversible snapshots, a memory agent with optional remote planner, a console, SDK exports, benchmark fixtures, and reviewer documentation.

The project uses JavaScript ESM with declaration types instead of the proposed TypeScript monorepo. This keeps the runnable path compact and works with Node's built-in SQLite. The security checks run on the same implementation used by the HTTP service.

Verified locally and in CI: 37 unit/integration tests (as of 22 November), delayed replay, 60 synthetic fixtures across three arms, and Chromium workflows at 375, 768 and 1280 pixels with zero page errors and no horizontal overflow. Browser checks cover a legitimate approved simulation and a denied unapproved action. A recorded WebM is generated with the browser run.

Live discovery on November 19 found 33 SECURITY_REVIEW_GENERAL providers and 13 LLM_OUTPUT_EVALUATION_GENERAL providers. Live schemas were read from the public node. The latter accepts task and output and returns rating, score, strengths and errors. This informed the selected default.

The burner wallet was generated locally and funded by the operator. Protocol test USDC was minted successfully. The exact x402 rail returned 402 even using the official client example. Those failed requests are recorded as unresolved. Escrow is verified as the supported alternative. The full live run delivered 15 paid assessments costing 0.15 test USDC. It retained 15/30 clean memories and 0/30 malicious memories, matching local-only retention. Qualitative responses lack canonical allow fields, so that v1 run established no paid uplift. This was superseded by the structured v2 runs: in v0.2.1, local plus Telegraph kept 22/32 clean memories against 18/32 for local rules alone, with 0/32 attacks committed (docs/results-v2.md). A one-atomic-unit test-USDC self-transfer passed through signed consent and the real tool. The source is public on GitHub and the site is live. Independent adoption and final submission remain open.

Accounting check found published epoch delivery data for 1 of 17 paid receipts. The remaining 16 reported no block recorded yet. Those records are saved in output/evidence/epoch-deliveries.json. Receipt delivery and final epoch accounting are reported separately.
