import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const privateKey = (process.env.PRIVATE_KEY || "").trim();
if (privateKey && !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
  throw new Error("Invalid PRIVATE_KEY format: expected 0x-prefixed 64-hex string. Check your .env.");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",  // 👈 match your contract pragma
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: privateKey ? [privateKey] : [],
      chainId: 11155111,
    },
  },
};

export default config;
