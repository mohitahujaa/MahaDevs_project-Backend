import { ethers } from "ethers";
import { readFileSync } from "fs";
import path from "path";
import QRCode from "qrcode";
import * as dotenv from "dotenv";
// Import the existing SHA-256 helper (ESM JS module)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error shimmed types in types/shims.d.ts
import { generateUserHash } from "../src/src/services/services/hashService.js";

dotenv.config();

type UserInput = {
  idNumber: string;
  tripStart: string;
  tripEnd: string;
  gender: string;
  itinerary: string;
  salt: string;
};

function parseArgs(argv: string[]): UserInput {
  // Positional args: idNumber tripStart tripEnd gender itinerary salt
  const [, , idNumber, tripStart, tripEnd, gender, itinerary, salt] = argv;
  if (!idNumber || !tripStart || !tripEnd) {
    console.error("Usage: npm run dtid:register -- <idNumber> <tripStart> <tripEnd> [gender] [itinerary] [salt]");
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
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim() || "";
  const privateKey = process.env.PRIVATE_KEY?.trim() || "";
  if (!rpcUrl || !privateKey) {
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in environment variables");
  }

  const input = parseArgs(process.argv);

  // 1) Build SHA-256 hex using existing service
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
  if (!/^([0-9a-f]{64})$/i.test(sha256Hex)) {
    throw new Error("hashService returned a non-SHA-256 hex string");
  }

  // 2) Convert to bytes32 (0x + 64-hex)
  const dtid: `0x${string}` = `0x${sha256Hex.toLowerCase()}`;
  console.log("DTID (bytes32):", dtid);

  // 3) Connect to Sepolia with ethers v6
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Using deployer address:", wallet.address);

  // 4) Load deployed contract
  const addresses = JSON.parse(readFileSync(path.resolve("artifacts/addresses.sepolia.json"), "utf-8"));
  const registryAddress: string = addresses.TouristIDRegistry;
  const artifact = JSON.parse(
    readFileSync(path.resolve("artifacts/contracts/TouristIDRegistry.sol/TouristIDRegistry.json"), "utf-8")
  );
  const contract = new ethers.Contract(registryAddress, artifact.abi, wallet);

  // 5) Call registerDTID (requires owner)
  const tx = await contract.registerDTID(dtid);
  console.log("Tx sent:", tx.hash);
  await tx.wait();
  console.log("DTID stored on-chain at contract:", registryAddress);

  // 6) Output a QR code file with the DTID
  const qrPath = path.resolve(`dtid-${input.idNumber}.png`);
  await QRCode.toFile(qrPath, dtid);
  console.log("QR code saved to:", qrPath);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});


