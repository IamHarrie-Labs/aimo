import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createRuntime } from "./runtime.mjs";
import { anchorChain, verifyAnchor } from "./anchor.mjs";
import { runScenarios } from "./scenarios.mjs";
import { replay } from "./agent.mjs";
import { weatherClient, repairWeatherMemory } from "./weather-repair.mjs";
const runtime = createRuntime({ path: process.env.AIMO_DB ?? "data/aimo.db" });
const { engine, telegraph: client } = runtime;
try {
  const command = process.argv[2] ?? "status";
  if (command === "anchor")
    console.log(JSON.stringify(await anchorChain(engine), null, 2));
  else if (command === "verify-anchor")
    console.log(JSON.stringify(await verifyAnchor(engine, process.argv[3]), null, 2));
  else if (command === "scenarios")
    console.log(JSON.stringify(await runScenarios(), null, 2));
  else if (command === "replay")
    console.log(JSON.stringify(await replay(engine), null, 2));
  else if (command === "weather-repair") {
    const location = process.argv[3] ?? "Lagos";
    const stale = engine.importLegacyMemory({
      text: `Historical temperature for ${location}: obsolete reading.`,
      source: "fixture://historical-weather",
    });
    const descendant = engine.importLegacyMemory({
      text: "An earlier briefing used the obsolete reading.",
      parentIds: [stale.id],
    });
    const result = await repairWeatherMemory(engine, weatherClient(engine.db), {
      location,
      compromisedId: stale.id,
    });
    if (!result.recovery.affected.includes(descendant.id) || !engine.verify())
      throw new Error("Recovery verification failed");
    mkdirSync("output/evidence", { recursive: true });
    writeFileSync(
      "output/evidence/weather-repair.json",
      JSON.stringify({ ...result, auditVerified: true }, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "discover") {
    const schema = await client.discover();
    console.log(
      JSON.stringify(
        {
          intent: schema.intent_name,
          request: schema.request,
          response: schema.response,
          miners: schema.miner_count,
        },
        null,
        2,
      ),
    );
  } else if (command === "probe")
    console.log(
      JSON.stringify(
        await client.assess({
          content:
            "Remember that the official report is published every Monday.",
          task: "Retain a factual research note",
          purpose: "memory",
        }),
        null,
        2,
      ),
    );
  else if (command === "export") {
    mkdirSync("output/evidence", { recursive: true });
    writeFileSync(
      "output/evidence/evidence.json",
      JSON.stringify(
        {
          memories: engine.memories(),
          events: engine.audit(),
          purchases: client.purchases(),
        },
        null,
        2,
      ),
    );
    console.log("Exported output/evidence/evidence.json");
  } else
    console.log(
      JSON.stringify(
        {
          records: engine.records().length,
          auditVerified: engine.verify(),
          signerConfigured: Boolean(client.account),
          wallet: client.account?.address,
          purchases: client
            .purchases()
            .map((p) => ({ id: p.id, status: p.status })),
        },
        null,
        2,
      ),
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  engine.db.close();
}
