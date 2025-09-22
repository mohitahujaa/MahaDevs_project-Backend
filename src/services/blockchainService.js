import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import * as dotenv from 'dotenv';
import TouristIDRegistryArtifact from '../../artifacts/contracts/TouristIDRegistry.sol/TouristIDRegistry.json' assert { type: 'json' };

dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

function loadContractAddress() {
  const p = path.resolve('artifacts/addresses.sepolia.json');
  const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return json.TouristIDRegistry;
}

export async function storeDTIDAndGenerateQR(dtidBytes32, options = {}) {
  const { generateQrFor = 'dtid', qrFileName = `dtid-${Date.now()}.png` } = options;
  if (!/^0x[0-9a-fA-F]{64}$/.test(dtidBytes32)) {
    throw new Error('Invalid DTID: expected 0x-prefixed 32-byte hex string');
  }
  if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
    throw new Error('Missing SEPOLIA_RPC_URL or PRIVATE_KEY in environment');
  }

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(loadContractAddress(), TouristIDRegistryArtifact.abi, wallet);

  const tx = await contract.registerDTID(dtidBytes32);
  await tx.wait();

  const qrValue = generateQrFor === 'dtid' ? dtidBytes32 : JSON.stringify({ dtid: dtidBytes32 });
  const outPath = path.resolve(qrFileName);
  await QRCode.toFile(outPath, qrValue);

  return { transactionHash: tx.hash, contractAddress: await contract.getAddress(), qrPath: outPath };
}
