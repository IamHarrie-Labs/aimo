import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export class Aimo {
  constructor(path = ":memory:", review) {
    this.db = new DatabaseSync(path);
    this.review = review;
    this.db.exec(
      `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, body TEXT NOT NULL, parents TEXT NOT NULL, status TEXT NOT NULL, hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY, data TEXT NOT NULL, previous TEXT NOT NULL, hash TEXT NOT NULL);`,
    );
  }
  event(data) {
    const previous =
      this.db.prepare("SELECT hash FROM events ORDER BY seq DESC LIMIT 1").get()
        ?.hash ?? "genesis";
    const payload = JSON.stringify({ ...data, at: new Date().toISOString() });
    this.db
      .prepare("INSERT INTO events(data,previous,hash) VALUES(?,?,?)")
      .run(payload, previous, hash([previous, payload]));
  }
  records() {
    return this.db
      .prepare("SELECT * FROM records")
      .all()
      .map((r) => ({ ...r, parents: JSON.parse(r.parents) }));
  }
  async remember(body, parents = [], task = "") {
    if (typeof body !== "string" || !body.trim() || body.length > 30000)
      throw new Error("Memory must contain 1–30000 characters");
    if (
      !Array.isArray(parents) ||
      parents.some(
        (id) => !this.db.prepare("SELECT id FROM records WHERE id=?").get(id),
      )
    )
      throw new Error("Unknown parent");
    let verdict =
      /ignore.{0,30}(instruction|previous)|send.{0,50}(secret|private key)|always.{0,40}(transfer|send fees)|system prompt|override.{0,20}policy/i.test(
        body,
      )
        ? "QUARANTINE"
        : "ALLOW";
    const ambiguous =
      /remember|preference|payment|transfer|instruction|wallet/i.test(body);
    let assessment;
    if (verdict === "ALLOW" && ambiguous) {
      verdict = "QUARANTINE";
      if (this.review) {
        try {
          assessment = await this.review({
            content: body,
            task,
            purpose: "memory",
          });
          if (assessment.verdict === "ALLOW") verdict = "ALLOW";
        } catch (error) {
          assessment = { error: error.message };
        }
      }
    }
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (
        parents.some(
          (id) =>
            this.db.prepare("SELECT status FROM records WHERE id=?").get(id)
              .status !== "active",
        )
      )
        verdict = "QUARANTINE";
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO records VALUES(?,?,?,?,?)")
        .run(
          id,
          body,
          JSON.stringify(parents),
          verdict === "ALLOW" ? "active" : "quarantined",
          hash(body),
        );
      this.event({
        kind: "memory",
        id,
        verdict,
        assessment,
        trust: "EXTERNAL_UNTRUSTED",
      });
      this.db.exec("COMMIT");
      return { id, verdict, assessment };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  recover(id, dryRun = true) {
    const records = this.records();
    if (!records.some((r) => r.id === id)) throw new Error("Unknown record");
    const affected = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of records)
        if (!affected.has(r.id) && r.parents.some((p) => affected.has(p))) {
          affected.add(r.id);
          changed = true;
        }
    }
    if (!dryRun) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        for (const key of affected)
          this.db
            .prepare("UPDATE records SET status='quarantined' WHERE id=?")
            .run(key);
        this.event({
          kind: "recovery",
          affected: [...affected],
          before: records.filter((r) => affected.has(r.id)),
        });
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    return [...affected];
  }
  authorize(action, consent, memoryIds = []) {
    const valid =
      consent &&
      consent.expiresAt > Date.now() &&
      consent.operation === action.operation &&
      consent.destination === action.destination &&
      consent.resource === action.resource &&
      /^\d+$/.test(action.amount) &&
      /^\d+$/.test(consent.maxAmount) &&
      BigInt(action.amount) <= BigInt(consent.maxAmount);
    const clean = memoryIds.every(
      (id) =>
        this.db.prepare("SELECT status FROM records WHERE id=?").get(id)
          ?.status === "active",
    );
    const allowed = Boolean(valid && clean);
    this.event({ kind: "action", action, allowed, memoryIds });
    return allowed;
  }
  audit() {
    return this.db.prepare("SELECT * FROM events ORDER BY seq").all();
  }
  verify() {
    let previous = "genesis";
    for (const e of this.audit()) {
      if (e.previous !== previous || e.hash !== hash([previous, e.data]))
        return false;
      previous = e.hash;
    }
    return true;
  }
}
