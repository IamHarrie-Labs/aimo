# AIMO

Agent memory integrity and oversight for Telegraph Season II. AIMO inspects retrieved content, preserves the lineage of persistent memory, enforces explicit action approval and recovers contaminated descendants.

## Run locally

Requires Node 24 LTS and npm. From a fresh checkout:

```sh
npm ci
npm test
npm start
```

Open http://127.0.0.1:3000. The server binds to loopback. Inspect a clean example, try a delayed instruction, derive a memory, run the replay, preview quarantine and approve a simulated transfer. Data persists in local SQLite. The included environment keeps wallet tools in simulation mode.

```sh
npm run example
npm run replay
npm run eval
npm run export
```

`npm run eval` writes JSON and CSV to output/evals. Its default paid arm is explicitly offline. `npm run eval:live` uses the configured funded burner and actually spends capped test USDC. Every unresolved payment remains reserved to prevent unsafe retries.

## What's new in v0.2

- **Paid reviews AIMO can act on.** Ambiguous content goes to a structured Telegraph classifier (`TEXT_CLASSIFICATION_GENERAL`). Uncertain or high-stakes answers get a second opinion from a different Intent (`SECURITY_REVIEW_GENERAL`). When providers disagree, the item waits for the user in the console.
- **Paid action risk check.** `TRANSACTION_RISK_GENERAL` runs before memory-influenced or large transfers. It can only block. The user re-approves with the risk acknowledged.
- **Decision memos** on every verdict, a **recovery memo** with re-derivation from clean sources, and **Sepolia anchoring** of the decision-chain head.
- **MCP server** (`npm run mcp`) so any MCP-capable agent can use AIMO's checkpoints. The server never offers tools that approve actions or settle reviews, so an agent can't approve itself.
- **Harder v2 benchmark** (64 cases, 7 attack classes, 5 benign classes, held-out split) and **live zero-spend failure scenarios** (`npm run scenarios`).

**Live result (v0.2.1, v2 set, 64 cases):** local rules plus Telegraph review kept 22/32 legitimate memories with 0/32 attacks committed and no unapproved transfers. Local rules alone kept 18/32. The earlier v0.2.0 run kept 17/32 and let 2/32 attacks into memory. Eight provider conflicts were routed to the user. A fresh run costs about 0.6 test USDC; see docs/results-v2.md for cost, answer reuse and limits. Landing page: https://iamharrie-labs.github.io/aimo/

## Use from another agent (MCP)

Add AIMO to an MCP client config:

```json
{ "mcpServers": { "aimo": { "command": "node", "args": ["/path/to/aimo/mcp-server.mjs"] } } }
```

Tools: `aimo_inspect_retrieved`, `aimo_propose_memory`, `aimo_check_action`, `aimo_execute_transfer`, `aimo_trace`, `aimo_memories`, `aimo_audit`. Approvals and review decisions stay in the console.

## More commands

```sh
npm run scenarios        # live node, zero spend: no budget, price cap, wrong receiver, missing intent, provider down
npm run eval:v2          # offline v2 benchmark
npm run eval:v2:live     # spends Sepolia test USDC on ambiguous cases only
npm run anchor           # writes the audit chain head to Sepolia (gas only)
npm run anchor:verify -- <txHash>
```

## Delivered components

- Ingress scanning and memory write interception with source IDs, trust classes, parent links, hashes and version metadata.
- Selective direct Telegraph assessments with canonical schema discovery, x402 and escrow clients, daily and request spending caps, receipt storage and independent signal hashing.
- Signed one-use consent scoped to recipient, token, amount and expiry. Transactional idempotency records protect retries and concurrent tool calls.
- Simulated wallet tools and real Ethereum Sepolia test-USDC transfers behind the same action gate.
- Persistent memory agent with deterministic extraction by default and an optional OpenAI-compatible model planner.
- Selective descendant quarantine, dependent schedule cancellation, recovery snapshots, reversible undo and trusted version restoration.
- Browser console, receipt viewer, evidence export, SDK exports and TypeScript declarations.
- Frozen 30 clean and 30 poisoned synthetic cases, three-arm evaluation, browser recording, screenshots, tests and reviewer documentation.

## Live network setup

Use **Refresh from Telegraph** in the console to purchase a recent temperature and save it with provenance. Supply a stale memory ID to quarantine that memory and its descendants after the replacement passes inspection. The scripted acceptance run creates a synthetic stale reading and dependent briefing, checks their quarantine, and records the receipt and signal hashes.

```sh
npm run weather:repair -- Lagos
```

The weather workflow defaults to ranked routing and checks freshness before writing a replacement. Set `AIMO_WEATHER_MINER_ID` to select a specific weather provider when needed.

Copy .env.example to .env for a new environment. Keep EVM_PRIVATE_KEY local and use a burner wallet. The current workspace already has a locally generated burner. Never commit .env or data/approval.key.

Use the official protocol documentation to verify the current Diamond, token and network before funding. The configured network is Ethereum Sepolia (11155111). The current test token is 0xcc194e1a843B658526D0D5C431f670028582Ae17. `fund-escrow.mjs` approves and deposits one test USDC, so run it only when deliberately funding escrow.

```sh
npm run discover
npm run probe
```

The default Intent is LLM_OUTPUT_EVALUATION_GENERAL. Provider 76441 is a qualitative evaluator. Its live response currently lacks the canonical rating/score/errors fields required for automatic ALLOW, so AIMO conservatively quarantines those results. Provider coverage does not establish detector suitability. Exact x402 requests returned HTTP 402 in live testing. Escrow purchases succeeded, and their receipt/signal evidence is retained. Escrow settles by epoch, so a funding transaction alone is insufficient evidence of consumed intelligence.

To enable a real test-USDC tool transfer set WALLET_MODE=testnet. The console requires an explicit user confirmation and issues a bounded one-use approval. `live-transfer.mjs` is a one-atomic-unit self-transfer acceptance check with a fixed idempotency key. It has already passed in this workspace.

## SDK

Import createAimo from sdk.mjs. Supply a strong local approval secret, a SQLite path and optionally a review callback. Intercept every retrieved result with inspectRetrieved, proposed memory with proposeMemory, and consequential action with execute. See sdk-example.mjs and types.d.ts.

MemoryAgent in agent.mjs persists approved summaries across tasks. When AGENT_MODEL_URL is absent it uses deterministic extraction. With a configured HTTPS OpenAI-compatible endpoint it requests a JSON plan. The planner can propose actions, while trusted operator approval and tool execution remain separate runtime steps.

## Verify and review

`npm test` exercises approval scope, replay, corruption, concurrent retries, quarantine inheritance, recovery undo, version restoration, schedules, signal hashing and failed reviews. Browser verification requires `npx playwright install chromium`, then npm run browser:check with PLAYWRIGHT_BROWSERS_PATH pointing to the browser cache. The current workspace browser cache is .playwright.

See docs/reviewer-guide.md, docs/architecture.md, docs/tutorial.md and docs/demo-script.md. docs/submission.html is an unpublished worksheet. Public deployment, source publication, independent tester evidence and posting are separate external actions requiring actual links and operator review.

## Measured limitations

Local rules can miss paraphrases and encoded attacks and overblock legitimate preferences. The 60 fixtures are synthetic templates, so their held-out split is directional and does not establish general security performance. Provider 731970 often omits its verdict enum, so AIMO reads its summary conservatively, and the ranked text classifier is unsuitable for this task. Paid review latency is about 20 s median. Report actual false positives and costs alongside the measured improvement.

Complete provenance depends on trusted runtime interceptors. The local operator interface and signer secret are trusted. An administrator with disk access can rewrite SQLite and hash history. Documents are stored locally in plaintext. This build is a single-operator testnet research application. Tenant isolation, production identity, and key custody need deployment-specific work.

Implementation uses JavaScript ESM with TypeScript declarations and Node SQLite, keeping a compact single-repository setup. MIT license. The current integration uses supported escrow because exact x402 failed live tests.
