# Mainnet readiness

AIMO runs on Ethereum Sepolia with test USDC today. This note lists what is tied to the test network, what already holds up for real money, and what has to change before anyone points it at mainnet funds.

**Status: not ready for mainnet.** The integrity checks and spend controls are network-independent. The network settings, key handling and provider choice are not.

## What is hard-coded to Sepolia

| Where | What | Change needed |
| --- | --- | --- |
| `telegraph.mjs` `NETWORK` | Chain `eip155:11155111`, test USDC contract `0xcc19…Ae17`, Telegraph escrow receiver `0x72a7…a08b` | Move into config per network. Load the mainnet USDC address and Telegraph's published mainnet receiver, never from a payment challenge. |
| `telegraph.mjs`, `wallet.mjs`, `anchor.mjs`, `fund-escrow.mjs` | `viem/chains` `sepolia` and the `SEPOLIA_RPC_URL` default (a public RPC) | Pick the chain from config. Use an authenticated RPC you trust, and check `getChainId()` on startup as `wallet.mjs` already does. |
| `TELEGRAPH_NODE` default | `https://devnode.telegraphprotocol.com` | Point at the production node once Telegraph publishes one. |
| `wallet.mjs` | Real transfers only when `WALLET_MODE=testnet`, and only of the Sepolia test token | Add an explicit `mainnet` mode that is off by default and needs its own per-transfer and daily limits. |
| `anchor.mjs` | Anchors the audit-chain head on Sepolia | Optional on mainnet. Anchoring costs gas per write, so batch it (for example daily). |

## What already carries over

- **Memory never approves money.** A transfer needs an explicit, signed approval from a person. This is enforced in the engine, not by the reviewers, and is covered by tests.
- **Spend caps.** `MAX_REVIEW_UUSDC` caps a single review (default 0.03 USDC) and `DAILY_REVIEW_UUSDC` caps the day (default 1 USDC). The budget is reserved before signing and released if the request is refused before payment.
- **Payment challenge checks.** Before signing, AIMO refuses an offer on the wrong chain, to an unexpected receiver, for the wrong resource, or above the cap (see the "wrong chain" and "receiver mismatch" tests in `scenarios.test.mjs`).
- **No automatic retries of paid requests.** An unresolved payment is recorded and must be reconciled (`npm run reconcile`), so a timeout can't double-pay.
- **Receipts.** Every paid answer is stored with its receipt hash, and receipts for another chain are rejected.
- **Tamper-evident log.** Decisions are hash-chained and verifiable with `aimo.verify()`.

## Key management

Today `EVM_PRIVATE_KEY` sits in a local `.env` file. That is fine for test USDC and unacceptable for real funds.

Before mainnet:

1. Split the keys. The key that pays Telegraph for reviews should hold only a small review budget. The key that can move user funds should be separate, or replaced by a smart account with on-chain spending limits.
2. Keep keys out of the process environment. Use a hardware wallet, a cloud KMS or a signing service, so a leaked log or crash dump can't expose them.
3. Rotate the review key on a schedule and whenever it may have been exposed. Keep its balance to about a week of review spend.
4. Never commit `.env`, `data/*.db` or `approval.key`. The repo's `.gitignore` already excludes them, and the published package ships only the source files it needs.

## Provider failover

Reviews come from two Telegraph providers chosen by intent and miner id (`AIMO_PRIMARY_*`, `AIMO_SECOND_*`). If a provider is down or slow:

- Read-only discovery calls retry with backoff. Paid calls don't.
- If review can't complete, the memory stays in quarantine and the agent carries on without it. Nothing is approved by default.
- If the two providers disagree, the case goes to a person.

Still needed for mainnet:

- A ranked list of backup providers per intent, chosen from Telegraph discovery, with a health check before paying.
- A per-provider error and disagreement rate, so a provider that starts returning poor answers can be dropped.
- An alert when the daily cap is reached, since reviews then stop and quarantined memories build up.

## Before switching

- [ ] Network settings moved into config, with Sepolia as the default
- [ ] Mainnet USDC and Telegraph receiver addresses confirmed from Telegraph's own docs
- [ ] Review key in a KMS or hardware wallet with a small balance
- [ ] Transfer tool behind a smart-account spending limit
- [ ] Caps set for the real budget and an alert when they're hit
- [ ] Backup providers configured and tested
- [ ] A full run of the v2 benchmark against the mainnet providers, reported in `docs/results-v2.md` format, before trusting their answers
- [ ] An outside security review of the payment path (`telegraph.mjs`, `escrow.mjs`, `wallet.mjs`)
