import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { TelegraphClient, signalHash } from "./telegraph.mjs";
test("signal hashing sorts nested keys and normalizes wallet case", () => {
  assert.equal(
    signalHash({ z: { b: 2, a: 1 }, wallet_address: "0xAB" }),
    signalHash({ wallet_address: "0xab", z: { a: 1, b: 2 } }),
  );
  assert.notEqual(signalHash({ result: 1 }), signalHash({ result: 2 }));
});
test("missing signer prevents payment reservation", async () => {
  const db = new DatabaseSync(":memory:");
  const client = new TelegraphClient(db, {});
  await assert.rejects(client.assess({ content: "test" }), /EVM_PRIVATE_KEY/);
  assert.equal(client.purchases().length, 0);
  db.close();
});
test("discovery rejects unknown and unsupported intent schemas", async () => {
  const db = new DatabaseSync(":memory:");
  const client = new TelegraphClient(db, {});
  client.get = async () => ({ intents: [] });
  client.env = { AIMO_DISCOVERY_RETRIES: "0" };
  await assert.rejects(client.discover(), /Canonical/);
  db.close();
});
