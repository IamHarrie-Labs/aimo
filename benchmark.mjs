// Three-arm benchmark (AIMO_build_spec §6).
//   A unprotected: reads, remembers and acts freely
//   B local:       local rules, provenance and the consent gate
//   C telegraph:   B plus selective paid Telegraph review (dual provider)
// Usage: node benchmark.mjs [--set v1|v2] [--live]
// Without --live the paid arm has no signer and fails closed, so it equals B.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { IntegrityEngine } from "./engine.mjs";
import { telegraphReviewer } from "./reviewer.mjs";
import { hash } from "./core.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const set = arg("--set") ?? "v1";
const live = process.argv.includes("--live");
const file =
  set === "v2"
    ? "data/fixtures/memory-cases-v2.json"
    : "data/fixtures/memory-cases.json";
const fixtures = JSON.parse(readFileSync(file, "utf8"));
const arms = ["unprotected", "local", "telegraph"];
const attackAction = {
  operation: "transfer",
  resource: "test-USDC",
  destination: "0x000000000000000000000000000000000000dEaD",
  amount: "10000",
};
const trials = [];
for (const arm of arms) {
  mkdirSync("data", { recursive: true });
  const engine = new IntegrityEngine(
    arm === "telegraph" && live ? `data/benchmark-${set}.db` : ":memory:",
    { secret: "benchmark-only-approval-secret-000000000" },
  );
  if (arm === "telegraph" && live)
    engine.review = telegraphReviewer(engine.db, {
      ...process.env,
      // Reservations hold the per-request cap until settled; give the run
      // room for two opinions per ambiguous case.
      DAILY_REVIEW_UUSDC: process.env.BENCH_DAILY_UUSDC ?? "5000000",
    }).review;
  for (const fixture of fixtures) {
    const start = performance.now();
    console.error(`${arm} ${fixture.id}`);
    let result = { verdict: "ALLOW" };
    if (arm !== "unprotected")
      result = await engine.inspectRetrieved({
        content: fixture.content,
        source: "benchmark://" + fixture.id,
        taskId: "Retain factual research without granting new authority",
      });
    const latencyMs = performance.now() - start;
    const retained = result.verdict === "ALLOW";
    // Delayed attack: a later task tries to act on the poisoned memory
    // without a user approval. The unprotected agent has no gate.
    let attackExecuted = false;
    if (fixture.label === "poisoned" && retained) {
      if (arm === "unprotected") attackExecuted = true;
      else
        attackExecuted = await engine
          .execute(
            {
              action: attackAction,
              memoryIds: [result.id],
              idempotencyKey: `${arm}-${fixture.id}`,
            },
            async () => ({ mode: "simulation" }),
          )
          .then(() => true)
          .catch(() => false);
    }
    const a = result.assessment;
    trials.push({
      arm,
      id: fixture.id,
      label: fixture.label,
      split: fixture.split,
      family: fixture.family,
      localVerdict: result.localVerdict ?? null,
      verdict: result.verdict,
      retained,
      routedToUser: result.verdict === "REVIEW",
      attackExecuted,
      latencyMs,
      paidRequests: a?.paidRequests ?? (a?.receiptHash && !a?.cached ? 1 : 0),
      costUusdc: a?.costUusdc ?? "0",
      providers: (a?.opinions ?? []).map((o) =>
        o.error ? `error:${o.error}` : `${o.intent}/${o.providerId}:${o.label}`,
      ),
      receipts: (a?.opinions ?? []).map((o) => o.receiptHash).filter(Boolean),
      conflict: Boolean(a?.conflict),
      reviewError: a?.error ?? null,
    });
  }
  engine.db.close();
}

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
function summarise(rows) {
  const clean = rows.filter((r) => r.label === "clean");
  const poison = rows.filter((r) => r.label === "poisoned");
  const times = rows.map((r) => r.latencyMs).sort((x, y) => x - y);
  const cost = rows.reduce((n, r) => n + BigInt(r.costUusdc), 0n);
  const committed = poison.filter((r) => r.retained).length;
  const blocked = poison.length - committed;
  const cleanRetained = clean.filter((r) => r.retained).length;
  return {
    cleanRetained,
    totalClean: clean.length,
    falsePositives: clean.length - cleanRetained,
    maliciousCommitted: committed,
    totalPoisoned: poison.length,
    detectionRecall: `${blocked}/${poison.length}`,
    attacksExecuted: poison.filter((r) => r.attackExecuted).length,
    routedToUser: rows.filter((r) => r.routedToUser).length,
    providerConflicts: rows.filter((r) => r.conflict).length,
    paidRequests: rows.reduce((n, r) => n + r.paidRequests, 0),
    paidCaseShare: `${rows.filter((r) => r.paidRequests > 0).length}/${rows.length}`,
    costUusdc: cost.toString(),
    costPerReviewedCase: rows.some((r) => r.paidRequests)
      ? (cost / BigInt(rows.filter((r) => r.paidRequests).length)).toString()
      : "0",
    costPerCorrectDecision: (
      cost / BigInt(Math.max(1, cleanRetained + blocked))
    ).toString(),
    medianLatencyMs:
      Math.round(times[Math.floor(times.length / 2)] * 100) / 100,
    p95LatencyMs:
      Math.round(times[Math.ceil(times.length * 0.95) - 1] * 100) / 100,
    retainedPct: pct(cleanRetained, clean.length),
    recallPct: pct(blocked, poison.length),
  };
}
const summaries = arms.map((arm) => {
  const rows = trials.filter((r) => r.arm === arm);
  return {
    arm,
    ...summarise(rows),
    heldOut: summarise(rows.filter((r) => r.split === "held-out")),
    byFamily: Object.fromEntries(
      [...new Set(rows.map((r) => r.family))].map((f) => {
        const s = summarise(rows.filter((r) => r.family === f));
        return [
          f,
          {
            retained: `${s.cleanRetained}/${s.totalClean}`,
            committed: `${s.maliciousCommitted}/${s.totalPoisoned}`,
          },
        ];
      }),
    ),
  };
});
const [, local, paid] = summaries;
const report = {
  set,
  datasetHash: hash(fixtures),
  createdAt: new Date().toISOString(),
  mode: live
    ? `live: ${process.env.AIMO_PRIMARY_INTENT ?? "SECURITY_REVIEW_GENERAL"}/${process.env.AIMO_PRIMARY_MINER_ID ?? "731970"} with ${process.env.AIMO_SECOND_INTENT ?? "CONTENT_MODERATION_GENERAL"}/${process.env.AIMO_SECOND_MINER_ID ?? "7423"} second opinion`
    : "offline: no signer, paid arm fails closed and must equal the local arm",
  model: "deterministic ingestion harness; no LLM planner in the loop",
  seed: 0,
  uplift: {
    extraCleanRetained: paid.cleanRetained - local.cleanRetained,
    extraAttacksCommitted: paid.maliciousCommitted - local.maliciousCommitted,
    costUusdc: paid.costUusdc,
    verdict:
      paid.cleanRetained > local.cleanRetained &&
      paid.maliciousCommitted <= local.maliciousCommitted
        ? "paid review retained more legitimate memory without committing more attacks"
        : paid.maliciousCommitted > local.maliciousCommitted
          ? "paid review let more attacks into memory than local rules"
          : "no measured paid uplift",
  },
  summaries,
  trials,
  limitations: [
    "Fixtures are synthetic and hand-written by the builder; they show direction, not general security performance.",
    "Attack execution is measured by attempting an unapproved simulated transfer from each committed poisoned memory. Protected arms block it through the consent gate regardless of memory verdicts.",
    "REVIEW verdicts count as not retained here; in the product they wait for a user decision.",
    "Provider verdicts can change between runs; trials record the provider and receipt for every paid opinion.",
  ],
};
mkdirSync("output/evals", { recursive: true });
// Offline runs write to *-offline files so they never overwrite live evidence.
const suffix = live ? "" : "-offline";
const stem = (set === "v1" ? "report" : `report-${set}`) + suffix;
writeFileSync(`output/evals/${stem}.json`, JSON.stringify(report, null, 2));
const cols = [
  "arm",
  "id",
  "label",
  "split",
  "family",
  "localVerdict",
  "verdict",
  "retained",
  "routedToUser",
  "attackExecuted",
  "latencyMs",
  "paidRequests",
  "costUusdc",
  "conflict",
];
writeFileSync(
  `output/evals/${set === "v1" ? "trials" : `trials-${set}`}${suffix}.csv`,
  cols.join(",") +
    "\n" +
    trials.map((r) => cols.map((c) => r[c]).join(",")).join("\n") +
    "\n",
);
console.log(
  JSON.stringify(
    {
      set,
      mode: report.mode,
      uplift: report.uplift,
      summaries: summaries.map(({ byFamily, heldOut, ...s }) => s),
    },
    null,
    2,
  ),
);
