// Anchors the head of AIMO's hash-linked decision chain on Ethereum Sepolia
// (AIMO_Plan §4.4). Only the 32-byte head hash goes on chain, never memory
// text. Anyone holding the exported audit log can recompute the head and
// compare it with the transaction input.
import {
  createPublicClient,
  createWalletClient,
  http,
  toHex,
  hexToString,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { NETWORK } from "./telegraph.mjs";

const PREFIX = "AIMO-CHAIN-V1:";
export const anchorData = (seq, head) => toHex(`${PREFIX}${seq}:${head}`);
export function parseAnchor(input) {
  const text = hexToString(input);
  const match = text.match(/^AIMO-CHAIN-V1:(\d+):([0-9a-f]{64})$/);
  if (!match) throw new Error("Transaction is not an AIMO chain anchor");
  return { seq: Number(match[1]), head: match[2] };
}

function clients(env) {
  const transport = http(
    env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
  );
  return {
    transport,
    rpc: createPublicClient({ chain: sepolia, transport }),
  };
}

export async function anchorChain(engine, env = process.env) {
  if (!engine.verify()) throw new Error("Audit chain failed verification");
  const head = engine.chainHead();
  if (!head) throw new Error("Audit chain is empty");
  if (!env.EVM_PRIVATE_KEY)
    throw new Error("Configure EVM_PRIVATE_KEY locally");
  const account = privateKeyToAccount(env.EVM_PRIVATE_KEY);
  const { transport, rpc } = clients(env);
  if ((await rpc.getChainId()) !== NETWORK.chainId)
    throw new Error("RPC chain mismatch");
  const wallet = createWalletClient({ account, chain: sepolia, transport });
  const txHash = await wallet.sendTransaction({
    to: account.address,
    value: 0n,
    data: anchorData(head.seq, head.hash),
  });
  const receipt = await rpc.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("Anchor reverted");
  engine.recordAnchor({
    seq: head.seq,
    head: head.hash,
    txHash,
    chainId: NETWORK.chainId,
  });
  return {
    seq: head.seq,
    head: head.hash,
    txHash,
    explorer: `https://sepolia.etherscan.io/tx/${txHash}`,
  };
}

export async function verifyAnchor(engine, txHash, env = process.env) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash ?? ""))
    throw new Error("Pass a Sepolia transaction hash");
  const { rpc } = clients(env);
  const tx = await rpc.getTransaction({ hash: txHash });
  const { seq, head } = parseAnchor(tx.input);
  const event = engine.db
    .prepare("SELECT hash FROM events WHERE seq=?")
    .get(seq);
  return {
    txHash,
    from: tx.from,
    seq,
    head,
    localChainVerified: engine.verify(),
    matchesLocalLog: event?.hash === head,
  };
}
