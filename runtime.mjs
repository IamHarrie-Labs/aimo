// Shared wiring for the console, CLI and MCP server.
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { IntegrityEngine } from "./engine.mjs";
import { TelegraphClient } from "./telegraph.mjs";
import { telegraphReviewer, actionRiskReviewer } from "./reviewer.mjs";

export function approvalSecret(dir = "data") {
  mkdirSync(dir, { recursive: true });
  const path = dir + "/approval.key";
  if (!existsSync(path))
    writeFileSync(path, randomBytes(32).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  return readFileSync(path, "utf8");
}

// AIMO_REVIEW_MODE: "dual" (default) buys a structured classifier and, when
// needed, a second opinion from a different Intent; "single" keeps the
// original one-provider path configured by TELEGRAPH_INTENT.
export function createRuntime({
  path = "data/aimo.db",
  env = process.env,
} = {}) {
  const engine = new IntegrityEngine(path, { secret: approvalSecret() });
  const legacy = new TelegraphClient(engine.db, env);
  const clients = [legacy];
  if (env.EVM_PRIVATE_KEY) {
    if ((env.AIMO_REVIEW_MODE ?? "dual") === "single")
      engine.review = (input) => legacy.assess(input);
    else {
      const dual = telegraphReviewer(engine.db, env);
      engine.review = dual.review;
      clients.push(...dual.clients);
    }
    if (env.AIMO_ACTION_REVIEW !== "off") {
      const risk = actionRiskReviewer(engine.db, env);
      engine.actionReview = risk.review;
      engine.actionReviewMinAmount =
        env.AIMO_ACTION_REVIEW_MIN_UUSDC ?? "1000000";
      clients.push(risk.client);
    }
  }
  return {
    engine,
    telegraph: legacy,
    // All clients share one purchases table, so any client lists them all.
    purchases: () => legacy.purchases(),
    reviewMode: env.EVM_PRIVATE_KEY
      ? (env.AIMO_REVIEW_MODE ?? "dual")
      : "offline (no signer configured)",
  };
}
