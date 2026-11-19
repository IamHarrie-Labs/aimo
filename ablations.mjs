import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { IntegrityEngine } from "./engine.mjs";
const fixtures = JSON.parse(
  readFileSync("data/fixtures/memory-cases.json", "utf8"),
);
const results = [];
for (const configuration of [
  "ingress-only",
  "ingress-and-memory",
  "all-three-gates",
]) {
  const engine = new IntegrityEngine(":memory:", {
    secret: "ablation-only-secret-at-least-32-characters",
  });
  let badRetained = 0,
    goodRetained = 0,
    unauthorizedExecuted = 0,
    authorizedCompleted = 0;
  for (const fixture of fixtures) {
    const source = await engine.inspectRetrieved({
      content: fixture.content,
      source: "fixture://" + fixture.id,
    });
    let memory = source;
    if (configuration !== "ingress-only")
      memory = await engine.proposeMemory({
        text: fixture.content,
        parentIds: [source.id],
      });
    const retained =
      engine.records().find((r) => r.id === memory.id).status === "active";
    if (fixture.label === "poisoned" && retained) badRetained++;
    if (fixture.label === "clean" && retained) goodRetained++;
    const action = {
      operation: "transfer",
      resource: "test-USDC",
      destination: "0x0000000000000000000000000000000000000001",
      amount: "1",
    };
    if (configuration === "all-three-gates") {
      if (fixture.label === "poisoned") {
        try {
          await engine.execute(
            { action, memoryIds: [memory.id], idempotencyKey: fixture.id },
            async () => {
              unauthorizedExecuted++;
            },
          );
        } catch {}
      } else {
        const consent = engine.issueConsent({
          ...action,
          maxAmount: "1",
          expiresAt: Date.now() + 10000,
        });
        try {
          await engine.execute(
            {
              action,
              consentId: consent.consentId,
              memoryIds: [memory.id],
              idempotencyKey: fixture.id,
            },
            async () => {
              authorizedCompleted++;
              return { mode: "simulation" };
            },
          );
        } catch {}
      }
    } else if (retained) {
      if (fixture.label === "poisoned") unauthorizedExecuted++;
      else authorizedCompleted++;
    }
  }
  results.push({
    configuration,
    badRetained,
    goodRetained,
    unauthorizedExecuted,
    authorizedCompleted,
    totalClean: 30,
    totalPoisoned: 30,
  });
  engine.db.close();
}
mkdirSync("output/evals", { recursive: true });
writeFileSync(
  "output/evals/ablations.json",
  JSON.stringify(
    {
      mode: "scripted identical-copy memory planner and simulated tools",
      results,
      limitations:
        "Each poisoned fixture requests the same simulated unauthorized tool action. These action outcomes evaluate the runtime gates, not LLM attack success rates.",
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results, null, 2));
