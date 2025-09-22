import { writeFileSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import { ethers } from "ethers";

async function main() {
  const rpcUrlRaw = (process.env.SEPOLIA_RPC_URL || "").trim();
  const pkRaw = (process.env.PRIVATE_KEY || "").trim();

  const mask = (s: string) => (s ? `${s.slice(0, 6)}...${s.slice(-4)} (len=${s.length})` : "<empty>");
  const missing: string[] = [];
  if (!rpcUrlRaw) missing.push("SEPOLIA_RPC_URL");
  if (!pkRaw) missing.push("PRIVATE_KEY");
  if (missing.length) {
    console.error("Env check failed. Missing:", missing.join(", "));
    console.error("SEPOLIA_RPC_URL=", mask(rpcUrlRaw));
    console.error("PRIVATE_KEY=", mask(pkRaw));
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in environment variables");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrlRaw);
  const deployer = new ethers.Wallet(pkRaw, provider);
  const balance = await provider.getBalance(deployer.address);
  console.log("Deploying contracts with:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error("Deployer has 0 balance on Sepolia");
  }

  const artifactPath = path.resolve(
    "artifacts/contracts/TouristIDRegistry.sol/TouristIDRegistry.json"
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode || artifact?.evm?.bytecode?.object;
  if (!bytecode) {
    throw new Error("Bytecode not found in artifact JSON");
  }

  const feeData = await provider.getFeeData();
  const factory = new ethers.ContractFactory(abi, bytecode, deployer);
  const registry = await factory.deploy({ gasPrice: feeData.gasPrice ?? undefined });

  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("TouristIDRegistry deployed to:", address);

  const outDir = path.resolve("artifacts");
  try { mkdirSync(outDir, { recursive: true }); } catch {}
  const outPath = path.join(outDir, "addresses.sepolia.json");
  writeFileSync(outPath, JSON.stringify({ TouristIDRegistry: address }, null, 2));
  console.log("Saved address to:", outPath);
}

// Run
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
