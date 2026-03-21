import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: { enabled: true, runs: 200 }
        }
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        sepolia: {
            url: SEPOLIA_RPC || "https://rpc.sepolia.org",
            accounts: [PRIVATE_KEY.length >= 64 ? (PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`) : "0x0000000000000000000000000000000000000000000000000000000000000000"],
            chainId: 11155111
        }
    }
};

export default config;

