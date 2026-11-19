import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { NETWORK } from "./telegraph.mjs";
const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
const transport = http(
  process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
);
const client = createPublicClient({ chain: sepolia, transport });
const wallet = createWalletClient({ chain: sepolia, transport, account });
if ((await client.getChainId()) !== NETWORK.chainId)
  throw new Error("Wrong chain");
const abi = parseAbi([
  "function approve(address,uint256) returns(bool)",
  "function depositUSDC(uint256)",
]);
const transactions = [];
for (const [address, functionName, args] of [
  [NETWORK.asset, "approve", [NETWORK.receiver, 1000000n]],
  [NETWORK.receiver, "depositUSDC", [1000000n]],
]) {
  const { request } = await client.simulateContract({
    account,
    address,
    abi,
    functionName,
    args,
  });
  const txHash = await wallet.writeContract(request);
  console.log(functionName, txHash);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error(functionName + " reverted");
  transactions.push({ functionName, txHash, chain: NETWORK.chain });
}
mkdirSync("output/evidence", { recursive: true });
// Keep every deposit: the first run wrote a single object.
const file = "output/evidence/escrow-funding.json";
const previous = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
const deposits = Array.isArray(previous) ? previous : [previous];
deposits.push({
  at: new Date().toISOString(),
  payer: account.address,
  amountUusdc: "1000000",
  transactions,
});
writeFileSync(file, JSON.stringify(deposits, null, 2));
