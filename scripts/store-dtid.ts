import { ethers } from "ethers";
import { readFileSync } from "fs";
import path from "path";
import QRCode from "qrcode";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim() || "";
  const privateKey = process.env.PRIVATE_KEY?.trim() || "";
  if (!rpcUrl || !privateKey) throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const addresses = JSON.parse(readFileSync("artifacts/addresses.sepolia.json", "utf-8"));
  const registryAddress = addresses.TouristIDRegistry;

  const artifact = JSON.parse(
    readFileSync(
      path.resolve("artifacts/contracts/TouristIDRegistry.sol/TouristIDRegistry.json"),
      "utf-8"
    )
  );
  const contract = new ethers.Contract(registryAddress, artifact.abi, wallet);

  const touristID = process.argv[2] || "TOURIST123";
  const startDate = process.argv[3] || "2025-09-22";
  const endDate = process.argv[4] || "2025-09-29";

  const dtid = ethers.keccak256(ethers.toUtf8Bytes(`${touristID}|${startDate}|${endDate}`));
  console.log("DTID:", dtid);

  const tx = await contract.registerDTID(dtid);
  console.log("Tx sent:", tx.hash);
  await tx.wait();
  console.log("Stored DTID at:", registryAddress);

  const qrPath = path.resolve(`dtid-${touristID}.png`);
  await QRCode.toFile(qrPath, dtid);
  console.log("QR saved:", qrPath);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});


