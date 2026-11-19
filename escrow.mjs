import { randomUUID } from "node:crypto";
import { NETWORK } from "./telegraph.mjs";
// Errors raised before the payment authorisation is signed carry
// prePayment: no money can have moved, so the caller may release the budget
// reservation and retry. Errors after signing never do.
const prePayment = (message) =>
  Object.assign(new Error(message), { prePayment: true });
const transient = (status, text) =>
  status >= 500 || (status === 404 && /miner_not_found/.test(text));
export async function escrowFetch(client, request, { retries = 3 } = {}) {
  const url = client.node + client.path;
  const body = JSON.stringify(request);
  const headers = { "Content-Type": "application/json" };
  let challenge;
  for (let attempt = 0; ; attempt++) {
    let status, text;
    try {
      challenge = await fetch(url, {
        method: "POST",
        headers,
        body,
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      status = challenge.status;
      if (status === 402) break;
      text = (await challenge.text()).slice(0, 300);
    } catch (error) {
      status = 0;
      text = error.message;
    }
    const message = `Escrow challenge unavailable (HTTP ${status}): ${text}`;
    if (attempt >= retries || !(status === 0 || transient(status, text)))
      throw prePayment(message);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  let challengeBody;
  try {
    challengeBody = await challenge.json();
  } catch {
    throw prePayment("Escrow challenge was not JSON");
  }
  const offer = challengeBody.accepts?.find(
    (a) => a.scheme === "escrow" && a.network === NETWORK.chain,
  );
  if (
    offer?.payTo?.toLowerCase() !==
    (client.env.TELEGRAPH_RECEIVER ?? NETWORK.receiver).toLowerCase()
  )
    throw prePayment("Escrow receiver mismatch");
  const template = offer.extra?.message;
  const value = template?.match(/Amount:\s*(\d+)\s*uUSDC/)?.[1];
  if (
    !value ||
    BigInt(value) > client.cap ||
    offer.extra.resource !== client.path.replace("/engine", "") ||
    !template.includes("Network: " + NETWORK.chain)
  )
    throw prePayment("Unsafe escrow challenge");
  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: client.account.address.toLowerCase(),
    to: offer.payTo,
    value,
    validAfter: String(now - 5),
    validBefore: String(now + 100),
    nonce: randomUUID(),
  };
  const message = template
    .replace("{from}", authorization.from)
    .replace("{nonce}", authorization.nonce)
    .replace("{validAfter}", authorization.validAfter)
    .replace("{validBefore}", authorization.validBefore);
  const signature = await client.account.signMessage({ message });
  const payment = Buffer.from(
    JSON.stringify({
      x402Version: 2,
      scheme: "escrow",
      network: NETWORK.chain,
      payload: { signature, authorization },
    }),
  ).toString("base64");
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "X-PAYMENT": payment },
    body,
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  return {
    response,
    offered: { amount: value, payTo: offer.payTo },
    rail: "escrow",
  };
}
