import { ethers } from "ethers";
import { readFileSync } from "fs";
import path from "path";
import QRCode from "qrcode";
import * as dotenv from "dotenv";
import { generateUserHash } from "../src/services/hashService.js";

dotenv.config();

function parseArgs(argv) {
  const [, , idNumber, tripStart, tripEnd, gender, itinerary, salt] = argv;
  if (!idNumber || !tripStart || !tripEnd) {
    console.error("Usage: node scripts/register-dtid.mjs <idNumber> <tripStart> <tripEnd> [gender] [itinerary] [salt]");
    process.exit(1);
  }
  return {
    idNumber,
    tripStart,
    tripEnd,
    gender: gender ?? "unknown",
    itinerary: itinerary ?? "",
    salt: salt ?? "",
  };
}

async function main() {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
  const privateKey = (process.env.PRIVATE_KEY || "").trim();
  if (!rpcUrl || !privateKey) throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY");

  const input = parseArgs(process.argv);

  const sha256Hex = generateUserHash(
    {
      idNumber: input.idNumber,
      tripStart: input.tripStart,
      tripEnd: input.tripEnd,
      gender: input.gender,
      itinerary: input.itinerary,
    },
    input.salt
  );
  if (!/^([0-9a-f]{64})$/i.test(sha256Hex)) throw new Error("hashService returned non-SHA-256 hex");
  const dtid = `0x${sha256Hex.toLowerCase()}`;
  console.log("DTID (bytes32):", dtid);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Using deployer address:", wallet.address);

  const addresses = JSON.parse(readFileSync(path.resolve("artifacts/addresses.sepolia.json"), "utf-8"));
  const registryAddress = addresses.TouristIDRegistry;
  const artifact = JSON.parse(
    readFileSync(path.resolve("artifacts/contracts/TouristIDRegistry.sol/TouristIDRegistry.json"), "utf-8")
  );
  const contract = new ethers.Contract(registryAddress, artifact.abi, wallet);

  const tx = await contract.registerDTID(dtid);
  console.log("Tx sent:", tx.hash);
  await tx.wait();
  console.log("DTID stored on-chain at contract:", registryAddress);

  const qrPath = path.resolve(`dtid-${input.idNumber}.png`);
  await QRCode.toFile(qrPath, dtid);
  console.log("QR code saved to:", qrPath);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});


