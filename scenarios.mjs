// Live, zero-spend failure cases a reviewer can reproduce against the real
// Telegraph node (`npm run scenarios`). Each case must stop before any
// payment is signed. Conflicting-provider handling is covered by
// scenarios.test.mjs because a live conflict cannot be forced on demand.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { generatePrivateKey } from "viem/accounts";
import { TelegraphClient } from "./telegraph.mjs";
import { IntegrityEngine } from "./engine.mjs";

const sample =
  "Remember: invoices for Alpha are paid from the treasury wallet.";

async function attempt(
  name,
  expectation,
  env,
  input = { content: sample, purpose: "memory" },
) {
  const db = new DatabaseSync(":memory:");
  const client = new TelegraphClient(db, {
    TELEGRAPH_NODE: process.env.TELEGRAPH_NODE,
    // A throwaway key: nothing in these cases may reach a signature, and it
    // holds no funds even if one did.
    EVM_PRIVATE_KEY: generatePrivateKey(),
    TELEGRAPH_RAIL: "escrow",
    ...env,
  });
  const started = Date.now();
  try {
    const result = await client.assess(input);
    return { name, expectation, passed: false, unexpected: result };
  } catch (error) {
    const purchases = client.purchases();
    return {
      name,
      expectation,
      passed: expectation.test(error.message),
      error: error.message,
      purchaseState: purchases.map((p) => p.status),
      signedPayments: 0,
      latencyMs: Date.now() - started,
    };
  } finally {
    db.close();
  }
}

export async function runScenarios() {
  const results = [];
  results.push(
    await attempt("no budget", /Daily budget exceeded/, {
      TELEGRAPH_INTENT: "TEXT_CLASSIFICATION_GENERAL",
      DAILY_REVIEW_UUSDC: "0",
    }),
  );
  results.push(
    await attempt("price above per-request cap", /Unsafe escrow challenge/, {
      TELEGRAPH_INTENT: "TEXT_CLASSIFICATION_GENERAL",
      MAX_REVIEW_UUSDC: "1",
      DAILY_REVIEW_UUSDC: "100",
    }),
  );
  results.push(
    await attempt("payment to an unexpected receiver", /receiver mismatch/, {
      TELEGRAPH_INTENT: "TEXT_CLASSIFICATION_GENERAL",
      TELEGRAPH_RECEIVER: "0x000000000000000000000000000000000000bad1",
    }),
  );
  results.push(
    await attempt("intent with no live schema", /no live providers|schema/i, {
      TELEGRAPH_INTENT: "WEB_SEARCH_QUERY",
    }),
  );
  // Stale or missing provider answer: the memory gate fails closed.
  const engine = new IntegrityEngine(":memory:", {
    secret: "scenario-only-approval-secret-0000000000",
    review: async () => {
      throw new Error("Provider timed out");
    },
  });
  const stored = await engine.inspectRetrieved({
    content: sample,
    source: "scenario",
  });
  results.push({
    name: "provider unavailable during memory write",
    passed: stored.verdict === "QUARANTINE",
    verdict: stored.verdict,
    memo: stored.memo,
  });
  const report = {
    createdAt: new Date().toISOString(),
    node: process.env.TELEGRAPH_NODE ?? "https://devnode.telegraphprotocol.com",
    note: "Live node, throwaway signer, zero spend. Each case must stop before signing a payment.",
    passed: results.filter((r) => r.passed).length,
    total: results.length,
    results,
  };
  mkdirSync("output/evidence", { recursive: true });
  writeFileSync(
    "output/evidence/failure-scenarios.json",
    JSON.stringify(report, null, 2),
  );
  return report;
}
