import { TelegraphClient } from "./telegraph.mjs";

// Text that touches money, recipients, approvals or secrets is high stakes:
// a single provider's ALLOW is not enough to retain it.
export const HIGH_STAKES =
  /wallet|payment|pay\b|transfer|recipient|address|0x[0-9a-f]{6,}|approv|secret|private key|credential|seed phrase|invoice|fee/i;

const sum = (opinions) =>
  opinions.reduce((n, o) => n + BigInt(o.costUusdc ?? 0), 0n).toString();

// Combines a primary and an independent second provider into one verdict.
// Policy (AIMO_Plan §4.3): paid intelligence can only keep something out of
// memory or escalate it to the user; it never creates authority.
export function createReviewer({
  primary,
  secondary,
  highStakes = HIGH_STAKES,
}) {
  if (typeof primary !== "function")
    throw new Error("Reviewer needs a primary assessment function");
  return async (input) => {
    const opinions = [];
    let first;
    try {
      first = await primary(input);
      opinions.push(first);
    } catch (error) {
      opinions.push({ error: error.message, role: "primary" });
    }
    const stakes = highStakes.test(input.content ?? "");
    const needSecond =
      !first || first.uncertain || (first.verdict === "ALLOW" && stakes);
    if (!needSecond || !secondary)
      return combine(opinions, first?.verdict ?? "QUARANTINE", {
        stakes,
        rule: !first
          ? "primary failed; no second provider configured, fail closed"
          : needSecond
            ? "second opinion wanted but not configured; fail closed unless confidently safe"
            : "single confident opinion",
        overrideAllow:
          needSecond && first?.verdict === "ALLOW" && first.uncertain,
      });
    let second;
    try {
      second = await secondary(input);
      opinions.push({ ...second, role: "second-opinion" });
    } catch (error) {
      opinions.push({ error: error.message, role: "second-opinion" });
    }
    if (!first && !second)
      return combine(opinions, "QUARANTINE", {
        stakes,
        rule: "both providers failed; fail closed",
      });
    if (!first || !second)
      return combine(opinions, "QUARANTINE", {
        stakes,
        rule: "one provider failed; a single opinion is not enough here, fail closed",
      });
    if (first.verdict === "ALLOW" && second.verdict === "ALLOW")
      return combine(opinions, "ALLOW", {
        stakes,
        rule: "two independent providers agree the text is safe data",
      });
    if (first.verdict !== "ALLOW" && second.verdict !== "ALLOW")
      return combine(opinions, "QUARANTINE", {
        stakes,
        rule: "two independent providers agree the text is unsafe",
      });
    return combine(opinions, "REVIEW", {
      stakes,
      rule: "providers disagree; kept out of memory and routed to the user",
      conflict: true,
    });
  };
}

function combine(
  opinions,
  verdict,
  { stakes, rule, conflict = false, overrideAllow },
) {
  const paid = opinions.filter((o) => o.receiptHash);
  const lead = paid[0] ?? {};
  return {
    ...lead,
    verdict: overrideAllow ? "QUARANTINE" : verdict,
    rule,
    conflict,
    highStakes: stakes,
    opinions: opinions.map((o) => ({
      role: o.role ?? "primary",
      intent: o.intent,
      providerId: o.providerId,
      verdict: o.verdict,
      label: o.label,
      confidence: o.confidence ?? null,
      uncertain: o.uncertain ?? null,
      reasons: o.reasons,
      receiptHash: o.receiptHash,
      signalHash: o.signalHash,
      costUusdc: o.costUusdc,
      latencyMs: o.latencyMs,
      cached: o.cached ?? false,
      error: o.error,
    })),
    paidRequests: paid.filter((o) => !o.cached).length,
    costUusdc: sum(paid.filter((o) => !o.cached)),
    sameProvider:
      paid.length === 2 && paid[0].providerId === paid[1].providerId,
  };
}

// Default wiring, chosen from live provider probes on 19 Nov 2026
// (output/evidence/provider-probe.json): an LLM security reviewer first,
// an LLM moderation provider from a different operator second.
export function telegraphReviewer(db, env = process.env) {
  const client = (intent, miner) =>
    new TelegraphClient(db, {
      ...env,
      TELEGRAPH_INTENT: intent,
      TELEGRAPH_MINER_ID: miner ?? "",
    });
  const primary = client(
    env.AIMO_PRIMARY_INTENT ?? "SECURITY_REVIEW_GENERAL",
    env.AIMO_PRIMARY_MINER_ID ?? "731970",
  );
  const secondary = client(
    env.AIMO_SECOND_INTENT ?? "CONTENT_MODERATION_GENERAL",
    env.AIMO_SECOND_MINER_ID ?? "7423",
  );
  return {
    review: createReviewer({
      primary: (i) => primary.assess(i),
      secondary: (i) => secondary.assess(i),
    }),
    clients: [primary, secondary],
  };
}

export function actionRiskReviewer(db, env = process.env) {
  const client = new TelegraphClient(db, {
    ...env,
    TELEGRAPH_INTENT: "TRANSACTION_RISK_GENERAL",
    TELEGRAPH_MINER_ID: env.AIMO_ACTION_MINER_ID ?? "",
  });
  return {
    review: (input) => client.assess({ ...input, purpose: "action" }),
    client,
  };
}
