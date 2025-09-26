import { ethers } from "ethers";
import { readFileSync } from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

function usage() {
  console.error("Usage: npm run dtid:verify -- <hex-32-byte-dtid>\n  Example: npm run dtid:verify -- 0x" + "ab".repeat(32));
}

async function main() {
  const dtid = (process.argv[2] || "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(dtid)) {
    usage();
    throw new Error("Invalid DTID format. Expect 0x + 64 hex chars");
  }

  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  if (!rpcUrl) throw new Error("Missing SEPOLIA_RPC_URL in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const addressesPath = path.resolve("artifacts/addresses.sepolia.json");
  const addresses = JSON.parse(readFileSync(addressesPath, "utf-8"));
  const registryAddress = addresses.TouristIDRegistry;

  const artifactPath = path.resolve("artifacts/contracts/TouristIDRegistry.sol/TouristIDRegistry.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

  const contract = new ethers.Contract(registryAddress, artifact.abi, provider);

  const isRegistered = await contract.verifyDTID(dtid);
  console.log(JSON.stringify({
    network: await provider.getNetwork(),
    contract: registryAddress,
    dtid,
    registered: isRegistered
  }, null, 2));
}

main().catch((e) => {
  console.error("✖ Verify error:", e.message);
  process.exit(1);
});
