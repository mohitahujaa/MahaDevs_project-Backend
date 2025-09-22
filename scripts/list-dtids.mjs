import { readFileSync } from "fs";
import { ethers } from "ethers";

const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
if (!rpcUrl) {
  console.error("Missing SEPOLIA_RPC_URL env var");
  process.exit(1);
}

const { TouristIDRegistry } = JSON.parse(readFileSync(new URL("../artifacts/addresses.sepolia.json", import.meta.url)));
const artifact = JSON.parse(readFileSync(new URL("../artifacts/contracts/TouristIDRegistry.sol/TouristIDRegistry.json", import.meta.url)));

const provider = new ethers.JsonRpcProvider(rpcUrl);
const contract = new ethers.Contract(TouristIDRegistry, artifact.abi, provider);

const total = await contract.totalDTIDs();
console.log("total:", total.toString());
for (let i = 0n; i < total; i++) {
  const dtid = await contract.getDTID(i);
  console.log(i.toString(), dtid);
}


