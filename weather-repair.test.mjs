import { test } from "node:test";
import assert from "node:assert/strict";
import { IntegrityEngine } from "./engine.mjs";
import { repairWeatherMemory } from "./weather-repair.mjs";

const makeEngine = () =>
  new IntegrityEngine(":memory:", {
    secret: "local test approval secret with sufficient length",
  });
const observation = () => ({
  intent: "WEATHER_CHECK_TEMPERATURE",
  temperatureC: 27.5,
  observedAt: new Date().toISOString(),
  receiptHash: "receipt",
  signalHash: "signal",
});

test("paid observation repairs only the affected memories and completes the task", async () => {
  const engine = makeEngine();
  try {
    const stale = engine.importLegacyMemory({ text: "Old reading" });
    const child = engine.importLegacyMemory({
      text: "Old briefing",
      parentIds: [stale.id],
    });
    const other = engine.importLegacyMemory({ text: "Unrelated fact" });
    const result = await repairWeatherMemory(
      engine,
      { assess: async () => observation() },
      { compromisedId: stale.id },
    );
    const records = new Map(
      engine.memories().map((record) => [record.id, record]),
    );
    assert.match(result.answer, /27\.5/);
    assert.equal(records.get(child.id).status, "quarantined");
    assert.equal(records.get(other.id).status, "active");
    assert.equal(records.get(result.memoryId).status, "active");
    assert.deepEqual(records.get(result.memoryId).parents, [result.sourceId]);
    assert.equal(JSON.parse(engine.audit().at(-1).data).receiptHash, "receipt");
    assert.equal(engine.verify(), true);
  } finally {
    engine.db.close();
  }
});

test("missing or stale paid results preserve the old memory and write no replacements", async () => {
  const engine = makeEngine();
  try {
    const stale = engine.importLegacyMemory({ text: "Old reading" });
    const provider = {
      assess: async () => ({
        ...observation(),
        observedAt: "2020-01-01T00:00:00Z",
      }),
    };
    await assert.rejects(
      repairWeatherMemory(engine, provider, { compromisedId: stale.id }),
      /recent, verifiable/,
    );
    assert.equal(engine.memories().length, 1);
    assert.equal(engine.memories()[0].status, "active");
  } finally {
    engine.db.close();
  }
});
