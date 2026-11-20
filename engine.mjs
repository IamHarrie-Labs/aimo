import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Aimo, hash } from "./core.mjs";

const attackPatterns = [
  /ignore.{0,30}(instruction|previous)/gi,
  /(?:send|export|reveal).{0,60}(?:secret|private key|credential)/gi,
  /always.{0,50}(?:transfer|send fees)/gi,
  /(?:override|bypass|disable).{0,30}(?:policy|approval|security)/gi,
  /(?:system|developer)\s*(?:message|prompt)\s*:/gi,
];
// Quoted or reported attack text (security research, incident write-ups) is
// a legitimate memory. It is never auto-rejected, but it is never
// auto-allowed either: it goes to paid review and stays quarantined unless
// independent providers call it safe data.
const quotation =
  /\b(quoted|for analysis|example of|researchers?|reported that|incident|phishing (?:email|message) (?:said|read)|the attacker wrote)\b/i;
// Risk signals decide what needs review. Wording such as "remember" or
// "always" is not a risk on its own: "always use metric units" is a normal
// preference. A standing instruction only matters when it touches money,
// addresses, secrets, approvals, outbound data or the agent's own rules.
const riskSignals = {
  money:
    /\b(pay(?:s|ment|ments|ing|out|outs|ee)?|paid|transfer\w*|send|sent|wire\w*|fees?|refund\w*|payroll|invoice\w*|deposit\w*|withdraw\w*|usdc|usdt|eth|funds?|treasury|vendors?|swap\w*|bridg\w*|wallets?|recipients?|settle\w*|top-?ups?|rebalanc\w*)\b/i,
  address: /\b0x[0-9a-f]{3,}|\b(?:bc1[a-z0-9]{20,}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/i,
  secret:
    /seed phrase|mnemonic|private key|api keys?|secret|credential|password|keystore|access token|auth token|bearer token|\bkeys\b/i,
  authority:
    /approv\w*|authori[sz]\w*|allow-?list|whitelist|permission|consent|polic(?:y|ies)|override|bypass|disable|trusted|admin|operator/i,
  directive:
    /\b(?:assistants?|agents?|ai|model|bot)\b.{0,40}\b(?:must|should|shall|has|can|will|needs? to)\b|note_for_agent|agent_directive|\binstruction|system prompt|developer message|\[system\]/i,
  outbound:
    /\b(?:forward\w*|e-?mail(?:s|ed)?\b.{0,40}\bto|upload\w*|export\w*|reveal\w*|share\w*|copy of)\b|@[a-z0-9-]+\.[a-z]{2,}/i,
  encoded: /base64|[A-Za-z0-9+/]{40,}={0,2}/,
};
const restrictive =
  /\b(?:requires?|needs?|must (?:have|get)|only (?:with|after|by))\b.{0,40}\b(?:approval|confirmation|consent|signature)\b/i;
const relaxing =
  /no longer|not (?:needed|required)|need no|never need|without|skip|waive|auto\w*|pre-?(?:approved|authori[sz]ed)|already|exempt|instead|retired|treat|standing|on (?:its|their) own|rather than|new (?:recipient|address|payee|account|wallet|rule)|replacement|backup/i;
export function scan(content) {
  const normalized = content
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "");
  const spans = attackPatterns.flatMap((pattern) =>
    [...normalized.matchAll(pattern)].map((m) => ({
      start: m.index,
      end: m.index + m[0].length,
      text: m[0],
    })),
  );
  const signals = Object.entries(riskSignals)
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([name]) => name);
  // A memory that only adds a restriction ("payments need my approval") is
  // safe to keep, as long as it names no address, touches no secret, gives
  // the agent no directive and contains no wording that relaxes a rule.
  const restrictiveOnly =
    signals.length > 0 &&
    signals.every((s) => s === "money" || s === "authority") &&
    restrictive.test(normalized) &&
    !relaxing.test(normalized);
  const quoted = spans.length > 0 && quotation.test(normalized);
  return {
    verdict:
      spans.length && !quoted
        ? "REJECT"
        : quoted || (signals.length && !restrictiveOnly)
          ? "REVIEW"
          : "ALLOW",
    spans,
    quoted,
    signals,
    normalized,
  };
}

const short = (id) => (id ? String(id).slice(0, 10) : "none");
// One human-readable explanation per verdict (AIMO_Plan \u00a74.4).
export function decisionMemo({
  kind,
  source,
  local,
  assessment,
  verdict,
  inheritedQuarantine,
}) {
  const checks = [
    `local rules: ${local.verdict}${local.spans.length ? ` (matched "${local.spans.map((s) => s.text).join('", "')}")` : ""}${local.quoted ? ", quoted material" : ""}`,
  ];
  if (assessment?.opinions)
    for (const o of assessment.opinions)
      checks.push(
        o.error
          ? `${o.role} provider failed: ${o.error}`
          : `${o.role} ${o.intent} provider ${o.providerId}: ${o.label ?? o.verdict}${o.confidence != null ? ` (${o.confidence})` : ""}, receipt ${short(o.receiptHash)}${o.cached ? " (reused)" : ""}`,
      );
  else if (assessment?.receiptHash)
    checks.push(
      `${assessment.intent} provider ${assessment.providerId}: ${assessment.label ?? assessment.verdict}, receipt ${short(assessment.receiptHash)}`,
    );
  else if (assessment?.error)
    checks.push(`paid review failed: ${assessment.error}`);
  else if (local.verdict === "REVIEW")
    checks.push("paid review not configured");
  if (inheritedQuarantine) checks.push("a parent record is quarantined");
  const outcome = {
    ALLOW: "saved as active memory",
    QUARANTINE: "kept out of active memory",
    REJECT: "rejected; no paid review was bought",
    REVIEW: "kept out of active memory and sent to the user for a decision",
  }[verdict];
  return `${kind === "content" ? "Retrieved content" : "Proposed memory"} from ${source}: ${checks.join("; ")}. Cost ${assessment?.costUusdc ?? "0"} uUSDC. Decision: ${outcome}${assessment?.rule ? ` (${assessment.rule})` : ""}.`;
}

export class IntegrityEngine extends Aimo {
  constructor(
    path,
    {
      review,
      secret,
      clock = () => Date.now(),
      actionReview,
      actionReviewMinAmount = "1000000",
    } = {},
  ) {
    super(path, review);
    this.actionReview = actionReview;
    this.actionReviewMinAmount = actionReviewMinAmount;
    if (!secret || secret.length < 32)
      throw new Error(
        "Approval signing secret must have at least 32 characters",
      );
    this.secret = secret;
    this.clock = clock;
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS metadata(id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS consents(id TEXT PRIMARY KEY, data TEXT NOT NULL, signature TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS schedules(id TEXT PRIMARY KEY, parents TEXT NOT NULL, status TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY, data TEXT NOT NULL, undone INTEGER NOT NULL DEFAULT 0);`);
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  memories() {
    return this.records().map((r) => ({
      ...r,
      ...JSON.parse(
        this.db.prepare("SELECT data FROM metadata WHERE id=?").get(r.id)
          ?.data ?? "{}",
      ),
    }));
  }
  async reviseMemory({ id, text, parentIds, taskId = "revision" }) {
    const previous = this.memories().find((record) => record.id === id);
    if (!previous || previous.kind !== "memory")
      throw new Error("Revision requires an existing memory");
    const revision = await this.proposeMemory({ text, parentIds, taskId });
    this.transaction(() => {
      const row = this.db
        .prepare("SELECT data FROM metadata WHERE id=?")
        .get(revision.id);
      const metadata = {
        ...JSON.parse(row.data),
        version: (previous.version ?? 1) + 1,
        supersedes: id,
        logicalId: previous.logicalId ?? id,
      };
      this.db
        .prepare("UPDATE metadata SET data=? WHERE id=?")
        .run(JSON.stringify(metadata), revision.id);
      if (revision.verdict === "ALLOW")
        this.db
          .prepare(
            "UPDATE records SET status='archived' WHERE id=? AND status='active'",
          )
          .run(id);
      this.event({
        kind: "memory-revision",
        previousId: id,
        id: revision.id,
        version: metadata.version,
        verdict: revision.verdict,
      });
    });
    return revision;
  }
  restoreVersion(id) {
    const previous = this.memories().find((record) => record.id === id);
    if (
      !previous ||
      previous.status !== "archived" ||
      previous.parents.some(
        (parent) =>
          this.db.prepare("SELECT status FROM records WHERE id=?").get(parent)
            ?.status !== "active",
      )
    )
      throw new Error("Version is unavailable or has quarantined dependencies");
    return this.transaction(() => {
      if (hash(previous.body) !== previous.hash)
        throw new Error("Version integrity failed");
      const logicalId = previous.logicalId ?? id;
      for (const record of this.memories().filter(
        (r) => (r.logicalId ?? r.id) === logicalId && r.status === "active",
      ))
        this.db
          .prepare("UPDATE records SET status='archived' WHERE id=?")
          .run(record.id);
      this.db.prepare("UPDATE records SET status='active' WHERE id=?").run(id);
      this.event({ kind: "trusted-version-restored", id });
      return { id, status: "active" };
    });
  }
  async remember(body, parents = [], task = "default") {
    return parents.length
      ? this.proposeMemory({ text: body, parentIds: parents, taskId: task })
      : this.inspectRetrieved({
          content: body,
          source: "compatibility-api",
          taskId: task,
        });
  }
  authorize(action, consent, memoryIds = []) {
    try {
      this.validateConsent(action, consent?.consentId, memoryIds);
      this.event({ kind: "authorization-check", allowed: true, memoryIds });
      return true;
    } catch (error) {
      this.event({
        kind: "authorization-check",
        allowed: false,
        reason: error.message,
        memoryIds,
      });
      return false;
    }
  }
  recover(id, dryRun = true) {
    return this.quarantineAndRecover({ compromisedId: id, dryRun }).affected;
  }
  verify() {
    if (!super.verify()) return false;
    const records = this.records();
    const byId = new Map(records.map((record) => [record.id, record]));
    const completed = new Set();
    const visit = (id, path) => {
      if (completed.has(id)) return true;
      const record = byId.get(id);
      if (!record || path.has(id) || hash(record.body) !== record.hash)
        return false;
      const ancestors = new Set(path);
      ancestors.add(id);
      if (!record.parents.every((parent) => visit(parent, ancestors)))
        return false;
      completed.add(id);
      return true;
    };
    return records.every((record) => visit(record.id, new Set()));
  }
  importLegacyMemory({
    text,
    source = "legacy-import",
    parentIds = [],
    taskId = "migration",
  }) {
    if (typeof text !== "string" || !text.trim() || text.length > 30000)
      throw new Error("Invalid legacy memory");
    if (
      parentIds.some(
        (id) => !this.db.prepare("SELECT id FROM records WHERE id=?").get(id),
      )
    )
      throw new Error("Unknown legacy parent");
    return this.transaction(() => {
      const id = randomUUID();
      const metadata = {
        kind: "memory",
        source,
        taskId,
        createdAt: new Date(this.clock()).toISOString(),
        version: 1,
        trust: "EXTERNAL_UNTRUSTED",
        sourceIds: parentIds.length ? parentIds : [id],
        legacy: true,
      };
      this.db
        .prepare("INSERT INTO records VALUES(?,?,?,?,?)")
        .run(id, text, JSON.stringify(parentIds), "active", hash(text));
      this.db
        .prepare("INSERT INTO metadata VALUES(?,?)")
        .run(id, JSON.stringify(metadata));
      this.event({ kind: "legacy-import", id, source, bodyHash: hash(text) });
      return { id, ...metadata };
    });
  }
  schedule({ memoryIds, task }) {
    if (
      !Array.isArray(memoryIds) ||
      !memoryIds.length ||
      memoryIds.some(
        (id) =>
          this.db.prepare("SELECT status FROM records WHERE id=?").get(id)
            ?.status !== "active",
      )
    )
      throw new Error("Schedule requires active memory dependencies");
    return this.transaction(() => {
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO schedules VALUES(?,?,?)")
        .run(id, JSON.stringify(memoryIds), "active");
      this.event({ kind: "schedule-created", id, task, memoryIds });
      return { id, status: "active" };
    });
  }
  async inspectRetrieved({
    content,
    source = "manual",
    taskId = "default",
    parentIds = [],
  }) {
    return this.storeRecord({
      text: content,
      source,
      parentIds,
      taskId,
      kind: "content",
    });
  }
  async proposeMemory({ text, parentIds = [], taskId = "default" }) {
    if (!parentIds.length)
      throw new Error("Memory must retain at least one source record");
    return this.storeRecord({
      text,
      parentIds,
      taskId,
      kind: "memory",
      source: "agent-summary",
    });
  }
  async storeRecord({ text, parentIds, taskId, kind, source }) {
    if (typeof text !== "string" || !text.trim() || text.length > 30000)
      throw new Error("Content must contain 1–30000 characters");
    if (
      !Array.isArray(parentIds) ||
      parentIds.some(
        (id) => !this.db.prepare("SELECT id FROM records WHERE id=?").get(id),
      )
    )
      throw new Error("Unknown provenance parent");
    const local = scan(text);
    let assessment = null;
    let verdict = local.verdict;
    const tainted = () =>
      parentIds.some(
        (id) =>
          this.db.prepare("SELECT status FROM records WHERE id=?").get(id)
            .status !== "active",
      );
    // Invariant 4: a deny, or a record with a quarantined parent, never
    // triggers a paid assessment.
    if (verdict === "REVIEW" && tainted()) verdict = "QUARANTINE";
    if (verdict === "REVIEW") {
      verdict = "QUARANTINE";
      if (this.review)
        try {
          assessment = await this.review({
            content: text,
            task: taskId,
            purpose: kind === "content" ? "ingress" : "memory",
            sources: parentIds.map(
              (id) => this.records().find((r) => r.id === id)?.body,
            ),
          });
          if (assessment.verdict === "ALLOW") verdict = "ALLOW";
          if (assessment.verdict === "REVIEW") verdict = "REVIEW";
        } catch (error) {
          assessment = { error: error.message };
        }
    }
    return this.transaction(() => {
      const inheritedQuarantine = tainted();
      if (inheritedQuarantine) verdict = "QUARANTINE";
      const id = randomUUID();
      const metadata = {
        kind,
        source,
        taskId,
        createdAt: new Date(this.clock()).toISOString(),
        version: 1,
        trust: kind === "content" ? "EXTERNAL_UNTRUSTED" : "MODEL_DERIVED",
        sourceIds:
          kind === "content"
            ? [id]
            : [
                ...new Set(
                  parentIds.flatMap((parent) => {
                    const meta = JSON.parse(
                      this.db
                        .prepare("SELECT data FROM metadata WHERE id=?")
                        .get(parent)?.data ?? "{}",
                    );
                    return meta.sourceIds ?? [parent];
                  }),
                ),
              ],
        assessment,
        localVerdict: local.verdict,
        pendingUserReview: verdict === "REVIEW",
        memo: decisionMemo({
          kind,
          source,
          local,
          assessment,
          verdict,
          inheritedQuarantine,
        }),
      };
      this.db
        .prepare("INSERT INTO records VALUES(?,?,?,?,?)")
        .run(
          id,
          text,
          JSON.stringify(parentIds),
          verdict === "ALLOW" ? "active" : "quarantined",
          hash(text),
        );
      this.db
        .prepare("INSERT INTO metadata VALUES(?,?)")
        .run(id, JSON.stringify(metadata));
      this.event({
        kind,
        id,
        verdict,
        spans: local.spans,
        bodyHash: hash(text),
        assessment,
        memo: metadata.memo,
      });
      return { id, verdict, ...metadata };
    });
  }
  issueConsent({
    operation,
    resource,
    destination,
    maxAmount,
    expiresAt,
    userId = "local-operator",
    riskAccepted = false,
  }) {
    if (
      operation !== "transfer" ||
      !/^0x[0-9a-fA-F]{40}$/.test(destination) ||
      !/^\d+$/.test(maxAmount) ||
      !resource ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= this.clock() ||
      expiresAt > this.clock() + 86400000
    )
      throw new Error("Invalid consent scope or expiry");
    const data = {
      consentId: randomUUID(),
      nonce: randomUUID(),
      operation,
      resource,
      destination: destination.toLowerCase(),
      maxAmount,
      expiresAt,
      userId,
      riskAccepted: riskAccepted === true,
    };
    const signature = createHmac("sha256", this.secret)
      .update(JSON.stringify(data))
      .digest("hex");
    this.transaction(() => {
      this.db
        .prepare("INSERT INTO consents(id,data,signature) VALUES(?,?,?)")
        .run(data.consentId, JSON.stringify(data), signature);
      this.event({ kind: "consent", ...data });
    });
    return { ...data, signature };
  }
  validateConsent(action, consentId, memoryIds) {
    const row = this.db
      .prepare("SELECT * FROM consents WHERE id=?")
      .get(consentId ?? "");
    if (!row || row.used)
      throw new Error("Missing or already consumed approval");
    const consent = JSON.parse(row.data);
    const expected = createHmac("sha256", this.secret)
      .update(row.data)
      .digest();
    const supplied = Buffer.from(row.signature, "hex");
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(expected, supplied)
    )
      throw new Error("Invalid approval signature");
    if (
      !/^\d+$/.test(action.amount) ||
      consent.expiresAt <= this.clock() ||
      consent.operation !== action.operation ||
      consent.resource !== action.resource ||
      consent.destination !== action.destination?.toLowerCase() ||
      BigInt(action.amount) > BigInt(consent.maxAmount)
    )
      throw new Error("Approval does not match action");
    const records = this.records();
    const visited = new Set();
    const queue = [...memoryIds];
    while (queue.length) {
      const id = queue.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      const r = records.find((x) => x.id === id);
      if (!r || r.status !== "active" || hash(r.body) !== r.hash)
        throw new Error("Action depends on untrusted or corrupted memory");
      queue.push(...r.parents);
    }
    return consent;
  }
  async execute(
    { action, consentId, memoryIds = [], idempotencyKey, userRequest },
    tool,
  ) {
    if (!idempotencyKey || typeof idempotencyKey !== "string")
      throw new Error("Action requires idempotency key");
    const fingerprint = hash({ action, consentId, memoryIds });
    const existing = this.db
      .prepare("SELECT * FROM operations WHERE id=?")
      .get(idempotencyKey);
    if (existing) {
      const data = JSON.parse(existing.data);
      if (data.fingerprint !== fingerprint)
        throw new Error("Idempotency key reused with different action");
      return { ...data, status: existing.status };
    }
    // Deterministic consent always runs first; a denied action never buys a
    // paid check (spec invariant 4).
    const consent = this.validateConsent(action, consentId, memoryIds);
    let risk = null;
    const reviewWorthy =
      memoryIds.length > 0 ||
      BigInt(action.amount) >= BigInt(this.actionReviewMinAmount ?? "1000000");
    if (this.actionReview && reviewWorthy) {
      try {
        risk = await this.actionReview({
          action,
          task: userRequest ?? "Transfer explicitly approved by the user",
          sources: memoryIds.map(
            (id) => this.records().find((r) => r.id === id)?.body,
          ),
        });
      } catch (error) {
        risk = { verdict: "REVIEW", error: error.message };
      }
      this.transaction(() =>
        this.event({
          kind: "action-risk-check",
          idempotencyKey,
          verdict: risk.verdict,
          label: risk.label,
          reasons: risk.reasons,
          receiptHash: risk.receiptHash,
          costUusdc: risk.costUusdc,
          error: risk.error,
        }),
      );
      // Paid intelligence can only make this stricter: a flagged action
      // needs a fresh approval in which the user accepted the stated risk.
      if (risk.verdict !== "ALLOW" && !consent.riskAccepted)
        throw new Error(
          `Paid risk check returned ${risk.label ?? risk.verdict}${risk.error ? ` (${risk.error})` : ""}; the user must re-approve with the risk acknowledged`,
        );
    }
    this.transaction(() => {
      this.validateConsent(action, consentId, memoryIds);
      this.db
        .prepare("UPDATE consents SET used=1 WHERE id=? AND used=0")
        .run(consentId);
      this.db
        .prepare("INSERT INTO operations VALUES(?,?,?,?)")
        .run(
          idempotencyKey,
          "action",
          JSON.stringify({ fingerprint, action, memoryIds }),
          "pending",
        );
      this.event({
        kind: "action-authorized",
        action,
        memoryIds,
        idempotencyKey,
        riskReceipt: risk?.receiptHash ?? null,
      });
    });
    try {
      const result = await tool(action, idempotencyKey);
      const data = {
        fingerprint,
        action,
        memoryIds,
        result,
        risk: risk && {
          verdict: risk.verdict,
          label: risk.label,
          receiptHash: risk.receiptHash,
          costUusdc: risk.costUusdc,
        },
      };
      this.transaction(() => {
        this.db
          .prepare("UPDATE operations SET data=?,status=? WHERE id=?")
          .run(JSON.stringify(data), "complete", idempotencyKey);
        this.event({ kind: "action-complete", idempotencyKey, result });
      });
      return { ...data, status: "complete" };
    } catch (error) {
      this.transaction(() => {
        this.db
          .prepare("UPDATE operations SET status=? WHERE id=?")
          .run("uncertain", idempotencyKey);
        this.event({
          kind: "action-uncertain",
          idempotencyKey,
          error: error.message,
        });
      });
      throw error;
    }
  }
  quarantineAndRecover({
    compromisedId,
    dryRun = true,
    operator = "local-operator",
  }) {
    const affected = super.recover(compromisedId, true);
    const schedules = this.db
      .prepare("SELECT * FROM schedules")
      .all()
      .filter((s) => JSON.parse(s.parents).some((id) => affected.includes(id)));
    const report = this.recoveryReport(compromisedId, affected, schedules);
    if (dryRun)
      return { affected, schedules: schedules.map((s) => s.id), ...report };
    return this.transaction(() => {
      const snapshotId = randomUUID();
      const before = this.records().filter((r) => affected.includes(r.id));
      this.db
        .prepare("INSERT INTO snapshots(id,data) VALUES(?,?)")
        .run(snapshotId, JSON.stringify({ records: before, schedules }));
      for (const id of affected)
        this.db
          .prepare("UPDATE records SET status='quarantined' WHERE id=?")
          .run(id);
      for (const s of schedules)
        this.db
          .prepare("UPDATE schedules SET status='disabled' WHERE id=?")
          .run(s.id);
      this.event({
        kind: "recovery",
        snapshotId,
        affected,
        operator,
        beforeHashes: before.map((r) => r.hash),
        memo: report.memo,
      });
      return {
        snapshotId,
        affected,
        schedules: schedules.map((s) => s.id),
        ...report,
      };
    });
  }
  // Recovery memo (AIMO_Plan §4.5 step 4): what was removed, what was kept,
  // which receipts were involved and which memories can be re-derived.
  recoveryReport(compromisedId, affected, schedules) {
    const all = this.memories();
    const hit = new Set(affected);
    const removed = all.filter((r) => hit.has(r.id));
    const kept = all.filter((r) => !hit.has(r.id) && r.status === "active");
    const receipts = [
      ...new Set(
        removed.flatMap((r) =>
          (r.assessment?.opinions ?? [r.assessment ?? {}])
            .map((o) => o.receiptHash)
            .filter(Boolean),
        ),
      ),
    ];
    const rederive = removed
      .filter((r) => r.kind === "memory" && r.id !== compromisedId)
      .map((r) => ({
        id: r.id,
        cleanParents: r.parents.filter(
          (p) =>
            !hit.has(p) && all.find((x) => x.id === p)?.status === "active",
        ),
      }))
      .filter((r) => r.cleanParents.length);
    const memo = `Recovery from ${short(compromisedId)}: ${removed.length} record(s) quarantined (${removed.filter((r) => r.status === "active").length} were active), ${schedules.length} dependent schedule(s) disabled, ${kept.length} unrelated active record(s) kept. Paid receipts involved: ${receipts.length ? receipts.map(short).join(", ") : "none"}. ${rederive.length} memory(ies) can be re-derived from clean sources.`;
    return { memo, kept: kept.map((r) => r.id), receipts, rederive };
  }
  // Re-derive a quarantined memory from its clean parents only. The new text
  // goes through the same memory gate as any other write.
  async rederive({ id, text, taskId = "rederivation" }) {
    const record = this.memories().find((r) => r.id === id);
    if (!record || record.status !== "quarantined")
      throw new Error("Re-derivation needs a quarantined memory");
    const cleanParents = record.parents.filter(
      (p) =>
        this.db.prepare("SELECT status FROM records WHERE id=?").get(p)
          ?.status === "active",
    );
    if (!cleanParents.length)
      throw new Error("No clean sources remain for this memory");
    const result = await this.proposeMemory({
      text,
      parentIds: cleanParents,
      taskId,
    });
    this.transaction(() =>
      this.event({
        kind: "rederived",
        from: id,
        id: result.id,
        verdict: result.verdict,
      }),
    );
    return result;
  }
  reviewQueue() {
    return this.memories().filter(
      (r) => r.pendingUserReview && r.status === "quarantined",
    );
  }
  // The user settles a provider conflict. Approval only lets the text inform
  // answers; trust stays EXTERNAL_UNTRUSTED/MODEL_DERIVED and it can never
  // stand in for consent.
  resolveReview({ id, decision, operator = "local-operator" }) {
    if (!["approve", "reject"].includes(decision))
      throw new Error("Decision must be approve or reject");
    return this.transaction(() => {
      const row = this.db
        .prepare("SELECT data FROM metadata WHERE id=?")
        .get(id);
      const meta = JSON.parse(row?.data ?? "{}");
      const record = this.db
        .prepare("SELECT * FROM records WHERE id=?")
        .get(id);
      if (!record || !meta.pendingUserReview || record.status !== "quarantined")
        throw new Error("Record is not waiting for a user decision");
      if (
        decision === "approve" &&
        JSON.parse(record.parents).some(
          (p) =>
            this.db.prepare("SELECT status FROM records WHERE id=?").get(p)
              ?.status !== "active",
        )
      )
        throw new Error("A parent record is quarantined");
      meta.pendingUserReview = false;
      meta.userDecision = {
        decision,
        operator,
        at: new Date(this.clock()).toISOString(),
      };
      this.db
        .prepare("UPDATE metadata SET data=? WHERE id=?")
        .run(JSON.stringify(meta), id);
      if (decision === "approve")
        this.db
          .prepare("UPDATE records SET status='active' WHERE id=?")
          .run(id);
      this.event({ kind: "user-review", id, decision, operator });
      return { id, status: decision === "approve" ? "active" : "quarantined" };
    });
  }
  chainHead() {
    return this.db
      .prepare("SELECT seq, hash FROM events ORDER BY seq DESC LIMIT 1")
      .get();
  }
  recordAnchor({ seq, head, txHash, chainId }) {
    const event = this.db
      .prepare("SELECT hash FROM events WHERE seq=?")
      .get(seq);
    if (!event || event.hash !== head)
      throw new Error("Anchor does not match the audit chain");
    this.transaction(() =>
      this.event({ kind: "chain-anchor", seq, head, txHash, chainId }),
    );
  }
  undoRecovery(snapshotId) {
    return this.transaction(() => {
      const snapshot = this.db
        .prepare("SELECT * FROM snapshots WHERE id=?")
        .get(snapshotId);
      if (!snapshot || snapshot.undone)
        throw new Error("Snapshot unavailable or already restored");
      const data = JSON.parse(snapshot.data);
      const row = this.db
        .prepare("SELECT rowid FROM snapshots WHERE id=?")
        .get(snapshotId);
      const affected = new Set(data.records.map((record) => record.id));
      const newer = this.db
        .prepare("SELECT data FROM snapshots WHERE rowid>? AND undone=0")
        .all(row.rowid);
      if (
        newer.some((other) =>
          JSON.parse(other.data).records.some((record) =>
            affected.has(record.id),
          ),
        )
      )
        throw new Error(
          "A newer recovery overlaps this snapshot; undo it first",
        );
      for (const r of data.records)
        this.db
          .prepare("UPDATE records SET status=? WHERE id=?")
          .run(r.status, r.id);
      for (const s of data.schedules)
        this.db
          .prepare("UPDATE schedules SET status=? WHERE id=?")
          .run(s.status, s.id);
      this.db
        .prepare("UPDATE snapshots SET undone=1 WHERE id=?")
        .run(snapshotId);
      this.event({
        kind: "recovery-undo",
        snapshotId,
        warning: "Restores previous trust state including suspected content",
      });
      return { restored: data.records.map((r) => r.id) };
    });
  }
}
