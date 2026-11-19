import { randomUUID } from "node:crypto";
import { TelegraphClient } from "./telegraph.mjs";

export function weatherClient(db, env = process.env) {
  return new TelegraphClient(db, {
    ...env,
    TELEGRAPH_INTENT: "WEATHER_CHECK_TEMPERATURE",
    TELEGRAPH_MINER_ID: env.AIMO_WEATHER_MINER_ID ?? "",
    TELEGRAPH_RAIL: env.TELEGRAPH_RAIL ?? "escrow",
  });
}

export async function repairWeatherMemory(
  engine,
  provider,
  { location = "Lagos", compromisedId } = {},
) {
  if (typeof location !== "string" || !location.trim() || location.length > 120)
    throw new Error("Enter a location of 1–120 characters");
  location = location.trim();
  const taskId = randomUUID();
  const existing =
    compromisedId &&
    engine.memories().find((record) => record.id === compromisedId);
  if (compromisedId && (!existing || existing.kind !== "memory"))
    throw new Error("Select an existing memory to repair");
  const paid = await provider.assess({ location, purpose: "weather-refresh" });
  const temperature = paid.temperatureC;
  const age = Date.now() - Date.parse(paid.observedAt);
  if (
    paid.intent !== "WEATHER_CHECK_TEMPERATURE" ||
    !paid.receiptHash ||
    !paid.signalHash ||
    !Number.isFinite(temperature) ||
    temperature < -90 ||
    temperature > 60 ||
    !Number.isFinite(age) ||
    age > 600000 ||
    age < -120000
  )
    throw new Error(
      "Telegraph did not return a recent, verifiable temperature",
    );
  const fact = `Telegraph reported ${temperature} °C for ${location} at ${paid.observedAt}.`;
  const source = await engine.inspectRetrieved({
    content: `Observation in degrees Celsius: ${temperature}.`,
    source: `telegraph:signal:${paid.signalHash}`,
    taskId,
  });
  const memory = await engine.proposeMemory({
    text: fact,
    parentIds: [source.id],
    taskId,
  });
  if (memory.verdict !== "ALLOW")
    throw new Error("The fresh observation did not pass the memory gate");
  const recovery = existing
    ? engine.quarantineAndRecover({ compromisedId: existing.id, dryRun: false })
    : null;
  const result = {
    taskId,
    answer: fact,
    location,
    temperatureC: temperature,
    observedAt: paid.observedAt,
    sourceId: source.id,
    memoryId: memory.id,
    recovery,
    receiptHash: paid.receiptHash,
    signalHash: paid.signalHash,
    providerId: paid.providerId,
    epochId: paid.epochId,
    costUusdc: paid.costUusdc,
  };
  engine.transaction(() =>
    engine.event({ kind: "weather-task-complete", ...result }),
  );
  return result;
}
