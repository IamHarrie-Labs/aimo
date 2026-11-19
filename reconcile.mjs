// Reconciles every local purchase database:
// - verified escrow receipts: fetch epoch delivery proofs
// - unresolved rows: classify as refused (HTTP 402 after signing, not
//   charged, released for retry) or still unknown (needs manual review)
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { TelegraphClient } from "./telegraph.mjs";

const dbs = readdirSync("data")
  .filter((f) => f.endsWith(".db"))
  .map((f) => "data/" + f);
const deliveries = [];
const unresolved = [];
for (const path of dbs) {
  const db = new DatabaseSync(path);
  if (
    !db.prepare("SELECT name FROM sqlite_master WHERE name='purchases'").get()
  ) {
    db.close();
    continue;
  }
  const client = new TelegraphClient(db);
  for (const purchase of client.purchases()) {
    if (purchase.status === "unresolved") {
      const refused = purchase.data.httpStatus === 402;
      // Raised before any signature, so nothing can have been paid.
      const preSign =
        /^(Escrow challenge unavailable \(HTTP [1-9]|Escrow receiver mismatch|Unsafe escrow challenge|Canonical Intent)/.test(
          purchase.data.error ?? "",
        );
      if (refused || preSign)
        db.prepare(
          "UPDATE purchases SET status='not-paid', reserved='0' WHERE id=?",
        ).run(purchase.id);
      unresolved.push({
        db: path,
        id: purchase.id,
        error: purchase.data.error,
        httpStatus: purchase.data.httpStatus ?? null,
        kind: refused ? "refused" : preSign ? "pre-signature" : "unknown",
        resolution: refused
          ? "refused by node after signing; not charged; released for retry"
          : preSign
          ? "failed before signing; not charged; released for retry"
          : "unknown; signed request timed out or failed in transit, check escrow balance before retrying",
      });
      continue;
    }
    if (purchase.status !== "verified") continue;
    const receipt = purchase.data.receipt;
    if (receipt?.rail !== "escrow") continue;
    const url =
      client.node +
      `/v1/blocks/${receipt.epoch_id}/deliveries/${receipt.receipt_hash}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      deliveries.push({
        db: path,
        receiptHash: receipt.receipt_hash,
        epochId: receipt.epoch_id,
        status: response.status,
        proof: await response.json(),
      });
    } catch (error) {
      deliveries.push({
        db: path,
        receiptHash: receipt.receipt_hash,
        error: error.message,
      });
    }
  }
  db.close();
}
mkdirSync("output/evidence", { recursive: true });
writeFileSync(
  "output/evidence/epoch-deliveries.json",
  JSON.stringify(deliveries, null, 2),
);
writeFileSync(
  "output/evidence/unresolved-payments.json",
  JSON.stringify(unresolved, null, 2),
);
console.log(
  JSON.stringify(
    {
      databases: dbs,
      verifiedReceipts: deliveries.length,
      proofAvailable: deliveries.filter((r) => r.status === 200).length,
      proofPending: deliveries.filter((r) => r.status === 404).length,
      unresolved: unresolved.length,
      releasedAsRefused: unresolved.filter((u) => u.kind === "refused").length,
      releasedPreSignature: unresolved.filter((u) => u.kind === "pre-signature").length,
      stillUnknown: unresolved
        .filter((u) => u.kind === "unknown")
        .map((u) => ({ db: u.db, error: u.error })),
    },
    null,
    2,
  ),
);
