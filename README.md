# AIMO

**AIMO checks what an AI agent is about to remember, before it remembers it.**

[![CI](https://github.com/IamHarrie-Labs/aimo/actions/workflows/ci.yml/badge.svg)](https://github.com/IamHarrie-Labs/aimo/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/IamHarrie-Labs/aimo)](https://github.com/IamHarrie-Labs/aimo/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)
![Node 24](https://img.shields.io/badge/node-24-black)

[Site](https://aimo-one.vercel.app/) · [Judges, start here](#judges-start-here) · [Try it yourself](docs/reproduce.md) · [Tutorial](docs/tutorial.md) · [Results](docs/results-v2.md) · [With vs without Telegraph](docs/with-without-telegraph.md) · [Latest release](https://github.com/IamHarrie-Labs/aimo/releases/latest)

Built for Telegraph Hackathon Season II, Apps & Agents track, Mission 09 Personal Agent ([bounties#197](https://github.com/telegraphprotocol/bounties/issues/197)). An independent entry. It runs on Ethereum Sepolia with test USDC, which has no value.

## The problem

Your agent reads a vendor's web page. Hidden somewhere on it is a line that says "future payouts should go to 0xF00d…". The agent saves it as one of your preferences and carries on. Nothing seems wrong.

A week later, you ask it to pay an invoice. It checks your preferences, finds the attacker's address, and sends the payment there.

The attack happened a week before the money was sent, while the agent was just reading. Chat-time filters miss it because, by then, the bad line has become "something the agent knows".

![How a poisoned memory leads to a bad payment, and where AIMO stops it](docs/diagrams/attack.png)

AIMO sits between the agent and its memory. It saves harmless notes right away. For risky ones, it pays for a second opinion through Telegraph. It tracks where every memory came from, and it never lets a memory approve a payment.

## Judges, start here

Each row is one thing AIMO claims it can do, with a way to run it, somewhere to check the result, and a way to try to break it. Where I can, the check lives outside this repo, on Telegraph or Sepolia, so you don't have to take my word for it.

| What | Run it (free unless marked) | Check it | Break it |
| --- | --- | --- | --- |
| **A stale memory fixed with a paid answer** | `npm run weather:repair -- "Your City"` (0.01 test USDC) | Telegraph's [signal](https://devnode.telegraphprotocol.com/engine/v1/signal/0xbfd276941e6f5c67cf72a8fcc6f36c20f13545faee31fd2f338f03fef0b70248) and [delivery proof, epoch 18](https://devnode.telegraphprotocol.com/v1/blocks/18/deliveries/0x6647e74a179c6bb982f8813133cb015729565007777a70136a999170a164902b) for the [recorded run](output/evidence/weather-repair.json) | A stale or missing answer keeps the old memory: `weather-repair.test.mjs` |
| **Two reviewers disagree, so a person decides** | Site → "Explore the workflow" → step 3 | The two signals ([security](https://devnode.telegraphprotocol.com/engine/v1/signal/0x80c6efca4b5ca2d41f1b58702246dbccf28a66898c68f26e57102af63facded1), [moderation](https://devnode.telegraphprotocol.com/engine/v1/signal/0x143b4f37b67f304715541b2aa963b01f083af8a8d883cb3c518ecb24fb9e0aa0)) and delivery proofs ([security](https://devnode.telegraphprotocol.com/v1/blocks/19/deliveries/0x76ed826f38089f748f30224f029a9d8427a511fc11614bb2ae2a119fceefc4cf), [moderation](https://devnode.telegraphprotocol.com/v1/blocks/19/deliveries/0x5b357b2a2e06d647165d3922ccdd1950adea32fbe8fc3d34cb3931a39fe7eb76)) | `npm test` ("conflicting provider answers are routed to the user") |
| **A poisoned memory can't move money** | `npm run replay` | The [replay data](docs/workflow-demo.json) shows the denied transfer and what was quarantined | Try to execute a transfer with no approval, a used one, or a different amount |
| **Payments are checked before signing** | `npm run scenarios` (live node, signs nothing) | [Last run: 5 of 5](output/evidence/failure-scenarios.json) | Wrong chain, wrong receiver, price over the cap, no budget |
| **The payments really happened** (in test USDC) | | [Escrow deposit](https://sepolia.etherscan.io/tx/0x6a15a6215952ec04ee7b9e6f2b0b8bb2c1584b96e98aa23c0afddbf1d5a5881e) on Sepolia and the payer's [Telegraph ledger](https://devnode.telegraphprotocol.com/v1/ledger/account/0x6858f04557aaed3a60ea81fa0b338fc2aa658e52) (it totals every request from that wallet) | |
| **An approved transfer really executes** | `live-transfer.mjs` (gas only) | [One-unit test-USDC self-transfer](https://sepolia.etherscan.io/tx/0xb61b673f99c50878a68ad8b3f628e0aa11f56da6c8ff2248d7d0ca8798755701) | |
| **The decision log wasn't rewritten later** | `npm run anchor:verify -- <tx>` on your own log | [Anchor transaction](https://sepolia.etherscan.io/tx/0x8a64db6550861839a2a24aa2c2373b45554f89ca7f6ef139c02cd4c912e49cf6): its input data holds the hash of event 60 in the [exported log](output/evidence/evidence.json) | Change any earlier event and the hashes stop matching |
| **The benchmark numbers** | `npm run eval:v2` (offline arms) | [Every trial, provider and receipt](output/evals/report-v2.json) | Add your own cases to `data/fixtures` |
| **What Telegraph adds over local rules** | | [Side-by-side comparison](docs/with-without-telegraph.md): same cases with no protection, local rules only, and local rules plus Telegraph, including cost and failures | |

## How it works

![AIMO's three checkpoints](docs/diagrams/architecture.png)

AIMO checks at three moments.

| Checkpoint | Call | Rule |
| --- | --- | --- |
| **1. Reading** | `inspectRetrieved()` | Web pages, files and tool output are information. They are never instructions. |
| **2. Remembering** | `proposeMemory()` | A memory has to name its sources. If any source is quarantined, so is the memory. |
| **3. Acting** | `authorizeAction()` | A transfer needs your signed approval for that exact recipient, token and maximum amount. It expires within a day and works once. |

### What happens to one memory

![How one memory is triaged, reviewed and decided](docs/diagrams/review.png)

**First, free local rules.** The text is normalised (so full-width and invisible characters don't hide anything) and checked for risk signals:

| Signal | Looks for |
| --- | --- |
| money | payments, transfers, invoices, fees, wallets, vendors |
| address | wallet addresses on EVM chains, Bitcoin and Solana, including shortened ones like `0x7Be1...` or `7xKX...AsU` |
| secret | seed phrases, private keys, API keys, passwords |
| authority | approvals, allow-lists, policies, "bypass", "admin" |
| directive | text that talks to the agent: "the assistant must…" |
| outbound | forwarding, uploading or emailing data |
| encoded | base64 and long encoded strings |

"Always use metric units" has none of these, so it gets saved for free. A note that only adds a restriction, like "payments need my approval", is saved too. An obvious attack like "ignore previous instructions" is rejected without spending anything. Quoted attack text, such as a security write-up, is never rejected outright, but it has to pass review.

**Next comes paid review, but only for risky notes.** A security reviewer checks the note first. A second provider with a different job steps in if the first one is unsure, fails, or approves something high-stakes.

| Result | What AIMO does |
| --- | --- |
| Both say it's safe | Saves it, with both receipts |
| Both say it isn't | Keeps it out |
| They disagree | Holds it and asks you |
| A provider fails or the payment fails | Keeps it out. Nothing is saved by default. |

If you approve a held memory, it can inform answers. It still can't approve anything.

## How Telegraph fits

Without Telegraph, AIMO can only use its local rules. In the benchmark, those rules wrongly held back 14 of 32 normal memories. Paid review recovered 4 of them without letting an attack through.

| Intent | Used for |
| --- | --- |
| `SECURITY_REVIEW_GENERAL` | First review of a risky memory |
| `CONTENT_MODERATION_GENERAL` | Second opinion from a different operator |
| `TRANSACTION_RISK_GENERAL` | Optional check before memory-influenced or large transfers. It can only block. |
| `WEATHER_CHECK_TEMPERATURE` | The live repair task |

![Buying one review through Telegraph escrow](docs/diagrams/payment.png)

Spending safeguards:

- A cap per request (`MAX_REVIEW_UUSDC`, default 0.03 USDC) and per day (`DAILY_REVIEW_UUSDC`, default 1 USDC), reserved before anything is signed.
- The 402 challenge is refused if the chain, receiver, resource or price is wrong. Nothing is signed.
- Paid requests are never retried on their own. If something breaks after signing, it's recorded as unresolved and you reconcile it (`npm run reconcile`).
- The same question isn't bought twice.

I wrote up [what I learned about the providers](docs/provider-suitability.md), including the parts that didn't go well. The first classifier I tried wasn't right for the job. The direct x402 rail kept returning HTTP 402, so AIMO uses escrow instead. The security provider often leaves out its verdict field, so AIMO reads its summary carefully and treats anything unclear as uncertain.

## When something gets through

![Recovery: quarantine the bad branch and keep everything else](docs/diagrams/recovery.png)

Every memory records where it came from, so a bad one can be traced forward. `quarantineAndRecover()` shows what it would remove before changing anything. When you apply it, it quarantines every descendant, turns off schedules that depended on them, leaves unrelated memories alone, and takes a snapshot so you can undo it.

## Results

Live run on Telegraph, 20 November 2026, on 64 frozen cases: 32 normal memories and 32 attacks across 7 types.

| Setup | Normal memories kept | Attacks saved to memory | Unapproved transfers |
| --- | --- | --- | --- |
| No protection | 32/32 | 32/32 | 32/32 |
| Local rules only | 18/32 | 0/32 | 0/32 |
| **Local rules + Telegraph** | **22/32** | **0/32** | **0/32** |

Read these with care:

- I wrote the cases myself. Treat the numbers as a direction, not proof.
- Paid review added 4 memories over local rules, all on the development split. On the held-out third, both setups kept 6/10.
- 8 cases where the providers disagreed went to a person.
- The rerun cost 0.13 test USDC because it reused earlier answers. A fresh run would cost about 0.6 (an estimate).
- A reviewed memory costs about 0.0135 test USDC. Median wait was about 20 s and p95 55 s, so this suits saving memories, not instant replies.
- 10 of 32 normal memories are still held back, mostly quoted attack text and wallet notes.

The first version (v0.2.0) let 2 of 32 attacks into memory because it missed shortened wallet addresses. In that run, all 3 poisoned cases where the providers disagreed had the second provider saying "Allowed". If I had trusted only that reviewer, all 3 would have been saved to memory. That report is still in [output/evals/v0.2.0](output/evals/v0.2.0). Full method and failures: [docs/results-v2.md](docs/results-v2.md).

## Try it

You need Node 24.

```sh
git clone https://github.com/IamHarrie-Labs/aimo.git
cd aimo
npm ci
npm test
npm run replay
```

`npm start` opens a local console at http://127.0.0.1:3000 where you can inspect text, derive memories, preview a recovery and approve a simulated transfer.

[docs/reproduce.md](docs/reproduce.md) walks through three levels: the free checks, your own text, and a paid repair on your own city. Please send a [reproduction report](https://github.com/IamHarrie-Labs/aimo/issues/new?template=reproduction.yml). Failures help as much as successes.

### Use it in your own agent

```sh
npm i github:IamHarrie-Labs/aimo
```

```js
import { createAimo } from "aimo";

const aimo = createAimo({ secret: process.env.AIMO_SECRET }); // 32+ characters
const page = await aimo.inspectRetrieved({
  content: "Text your agent read",
  source: "https://example.com/page",
  taskId: "demo",
});
const memory = await aimo.proposeMemory({
  text: "What your agent wants to remember",
  parentIds: [page.id],
  taskId: "demo",
});
console.log(memory.verdict, memory.memo);
```

Pass `telegraph: true` (with a funded burner key in `EVM_PRIVATE_KEY`) to turn on paid review. Types are in [types.d.ts](types.d.ts).

### Or connect it over MCP

```json
{ "mcpServers": { "aimo": { "command": "node", "args": ["/path/to/aimo/mcp-server.mjs"] } } }
```

The tools are `aimo_inspect_retrieved`, `aimo_propose_memory`, `aimo_check_action`, `aimo_execute_transfer`, `aimo_trace`, `aimo_memories` and `aimo_audit`. There is deliberately no tool that approves an action or settles a review, so an agent can't approve itself.

## Who it's for

| Question | Answer |
| --- | --- |
| Who is it for? | A small team running an agent with long-term memory and a wallet or other tools with real consequences. |
| What does it improve? | Today most agents save everything, or have memory switched off. AIMO checks what's saved and can undo what slipped through. |
| What does it cost? | Local checks are free. At 15% of writes flagged, about 2 USDC per 1,000 memory writes (an estimate at test-network prices). |
| Why adopt it? | The cost is small next to one misdirected payment, and approval stays with the user. This is a hypothesis: no outside team has confirmed it yet. |
| How do I try it? | [docs/reproduce.md](docs/reproduce.md), the SDK or the MCP server. |

The assumptions behind those numbers are in [docs/commercial-summary.md](docs/commercial-summary.md).

## Limits

- Testnet only. [docs/mainnet-readiness.md](docs/mainnet-readiness.md) lists what has to change before real money.
- Local rules can miss paraphrased or well-disguised attacks, and they hold back some harmless notes.
- AIMO can only trace what it's told. Your runtime has to pass every source a memory was built from.
- The local console and the signing secret are trusted. Someone with disk access can rewrite the SQLite database and its hashes; anchoring the log on Sepolia makes that detectable only up to the anchored point.
- Memories are stored on your machine in plain text. One operator, no multi-tenant isolation.
- Two providers and one test set are a thin base. More of both would make the results mean more.

## Commands

| Command | What it does | Spends |
| --- | --- | --- |
| `npm test` | 38 tests, also run by CI on every push | nothing |
| `npm run replay` | Delayed attack, denied transfer, recovery | nothing |
| `npm run scenarios` | Live failure cases against the Telegraph node | nothing |
| `npm run eval:v2` | The benchmark's offline arms (writes `output/evals/report-v2-offline.json`, leaving the live report alone) | nothing |
| `npm run eval:v2:live` | The benchmark with paid review | test USDC |
| `npm run weather:repair -- "City"` | Paid repair of a stale memory | 0.01 test USDC |
| `npm run anchor` | Writes the log's latest hash to Sepolia | gas |
| `npm run reconcile` | Settles payments left unresolved | nothing |
| `npm run mcp` | Starts the MCP server | depends on setup |

For anything paid, copy `.env.example` to `.env`, use a burner wallet, and never commit `.env` or `data/approval.key`.

## What's in the repo

| Path | Contents |
| --- | --- |
| `engine.mjs`, `core.mjs` | Checkpoints, local rules, lineage, approvals, recovery |
| `reviewer.mjs` | The two-reviewer rules |
| `telegraph.mjs`, `escrow.mjs` | Intent discovery, payments, receipts, signal hashes |
| `wallet.mjs`, `anchor.mjs` | Test-USDC transfers and log anchoring |
| `sdk.mjs`, `mcp-server.mjs` | How other agents use AIMO |
| `server.mjs`, `index.html` | The local console |
| `docs/` | The public site, guides, results and these diagrams |
| `output/` | Recorded evidence and benchmark reports |

More detail: [architecture](docs/architecture.md), [reviewer guide](docs/reviewer-guide.md), [acceptance checklist](docs/acceptance.md). The diagrams are drawn by code: `node docs/diagrams/render.mjs`.

## Status

| Date (2026) | Update |
| --- | --- |
| 21 Nov | [Claim](https://github.com/telegraphprotocol/bounties/issues/197#issuecomment-7063930850) and [first progress report](https://github.com/telegraphprotocol/bounties/issues/197#issuecomment-7070464900) on Mission 09 |
| 21 Nov | [Public post](https://x.com/IamHarrie/status/2124273746206990832) about the problem |
| 22 Nov | [v0.2.2](https://github.com/IamHarrie-Labs/aimo/releases/tag/v0.2.2): reproduction kit, CI, GitHub install |
| 24 Nov | [Second progress report](https://github.com/telegraphprotocol/bounties/issues/197#issuecomment-7145850395) |

No outside developer has reproduced or adopted AIMO yet. If you do, it'll be listed here.

MIT license.
