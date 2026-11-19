import { IntegrityEngine } from "./engine.mjs";
import { transferTool } from "./wallet.mjs";
import { NETWORK } from "./telegraph.mjs";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const engine = new IntegrityEngine("data/aimo.db", {
  secret: readFileSync("data/approval.key", "utf8"),
});
try {
  const address = privateKeyToAccount(process.env.EVM_PRIVATE_KEY).address;
  const action = {
    operation: "transfer",
    resource: NETWORK.asset,
    destination: address,
    amount: "1",
  };
  const key = "self-transfer-acceptance-v1";
  const existing = engine.db
    .prepare("SELECT * FROM operations WHERE id=?")
    .get(key);
  if (existing) {
    console.log("Existing transfer acceptance result", existing.status);
  } else {
    const approval = engine.issueConsent({
      ...action,
      maxAmount: "1",
      expiresAt: Date.now() + 300000,
    });
    const result = await engine.execute(
      { action, consentId: approval.consentId, idempotencyKey: key },
      transferTool({ ...process.env, WALLET_MODE: "testnet" }),
    );
    mkdirSync("output/evidence", { recursive: true });
    writeFileSync(
      "output/evidence/self-transfer.json",
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result.result));
  }
} finally {
  engine.db.close();
}
