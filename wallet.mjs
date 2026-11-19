import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { NETWORK } from "./telegraph.mjs";
export function transferTool(env = process.env) {
  return async (action) => {
    if (env.WALLET_MODE !== "testnet")
      return { mode: "simulation", executed: true, action };
    if (!env.EVM_PRIVATE_KEY) throw new Error("Wallet signer unavailable");
    if (action.operation !== "transfer" || action.resource !== NETWORK.asset)
      throw new Error("Only configured Sepolia test USDC permitted");
    const transport = http(
      env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
    );
    const account = privateKeyToAccount(env.EVM_PRIVATE_KEY);
    const client = createPublicClient({ chain: sepolia, transport });
    if ((await client.getChainId()) !== NETWORK.chainId)
      throw new Error("RPC chain mismatch");
    const abi = parseAbi([
      "function transfer(address to,uint256 amount) returns(bool)",
    ]);
    const { request } = await client.simulateContract({
      account,
      address: NETWORK.asset,
      abi,
      functionName: "transfer",
      args: [action.destination, BigInt(action.amount)],
    });
    const wallet = createWalletClient({ account, chain: sepolia, transport });
    const txHash = await wallet.writeContract(request);
    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") throw new Error("Transfer reverted");
    return { mode: "testnet", txHash, chainId: NETWORK.chainId };
  };
}
