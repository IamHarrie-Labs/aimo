import { IntegrityEngine } from "./engine.mjs";
import {
  createReviewer,
  telegraphReviewer,
  actionRiskReviewer,
} from "./reviewer.mjs";
export {
  IntegrityEngine,
  createReviewer,
  telegraphReviewer,
  actionRiskReviewer,
};

// createAimo({ secret, path?, review?, actionReview?, telegraph? })
// Pass `telegraph: true` (with EVM_PRIVATE_KEY in the environment) to buy
// structured reviews and second opinions through Telegraph automatically.
export function createAimo(options) {
  const engine = new IntegrityEngine(options.path ?? ":memory:", options);
  if (options.telegraph) {
    const env = options.env ?? process.env;
    engine.review ??= telegraphReviewer(engine.db, env).review;
    engine.actionReview ??= actionRiskReviewer(engine.db, env).review;
  }
  // Spec surface (AIMO_build_spec §7): authorizeAction runs checkpoint 3 and
  // invokes the tool only if every gate passes.
  engine.authorizeAction = ({
    tool,
    args,
    memoryIds = [],
    consentId,
    idempotencyKey,
    userRequest,
  }) =>
    engine.execute(
      { action: args, memoryIds, consentId, idempotencyKey, userRequest },
      tool,
    );
  return engine;
}
export async function guardedTool(
  engine,
  { tool, args, memoryIds, consentId, idempotencyKey },
) {
  return engine.execute(
    { action: args, memoryIds, consentId, idempotencyKey },
    tool,
  );
}
