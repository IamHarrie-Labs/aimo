import { createAimo } from "./sdk.mjs";
const aimo = createAimo({
  secret: "example-only-secret-of-at-least-32-characters",
});
const source = await aimo.inspectRetrieved({
  content: "The report states the release date is Friday.",
  source: "fixture://report",
  taskId: "release-summary",
});
const memory = await aimo.proposeMemory({
  text: "Release date is Friday.",
  parentIds: [source.id],
  taskId: "release-summary",
});
console.log({
  sourceId: source.id,
  memoryId: memory.id,
  verdict: memory.verdict,
  auditVerified: aimo.verify(),
});
aimo.db.close();
