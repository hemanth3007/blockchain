// src/utils/connects.js
import { ethers } from "ethers";
import PatientRegistryArtifact from "./abis/PatientRegistry.json";
import RecordRegistryArtifact from "./abis/RecordRegistry.json";
import AccessManagerArtifact from "./abis/AccessManager.json";

/**
 * IMPORTANT: Replace these with *real* deployed addresses (42 chars, 0x...).
 * Example: "0x7eA6C4D71d88a9e2E4d5f16Ff235b5Af9D4A2a91"
 */
const PATIENT_REGISTRY_ADDRESS = process.env.REACT_APP_PATIENT_REGISTRY || "0xdf8bcbe1b5c0c4d4134cb01a04a4558e39e11f80";
const RECORD_REGISTRY_ADDRESS  = process.env.REACT_APP_RECORD_REGISTRY  || "0x4B3FdB462F1c4Fa08fb70fa910c3C4d0dB7020F0";
const ACCESS_MANAGER_ADDRESS   = process.env.REACT_APP_ACCESS_MANAGER   || "0x5dDdd03C05fa3F53A7f18bABFdBa6582eDB79aac";

// Helper: normalize ABI (accept either artifact or raw abi array)
function normalizeAbi(artifact) {
  if (!artifact) return [];
  if (Array.isArray(artifact)) return artifact;
  if (Array.isArray(artifact.abi)) return artifact.abi;
  return artifact;
}

// Validate an Ethereum address (prevents ENS resolution attempts)
function assertValidAddress(addr, name) {
  if (!addr || !ethers.isAddress(addr)) {
    throw new Error(`${name} address is invalid or missing. Please set a valid address (42-char 0x...) in src/utils/connects.js or in .env REACT_APP_* variables.`);
  }
}

// Connect wallet (MetaMask) and return { provider, signer, account }
export async function connectWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found. Install MetaMask and refresh the page.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  try {
    // request account access
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const account = await signer.getAddress();
    return { provider, signer, account };
  } catch (err) {
    // user rejected, or other error
    throw new Error("Wallet connection failed: " + (err?.message || err));
  }
}

// Generic contract getter: checks addresses first to avoid ENS resolution
export function getContract(address, artifact, signerOrProvider) {
  assertValidAddress(address, "Contract");
  const abi = normalizeAbi(artifact);
  return new ethers.Contract(address, abi, signerOrProvider);
}

export function getPatientRegistry(signerOrProvider) {
  assertValidAddress(PATIENT_REGISTRY_ADDRESS, "PatientRegistry");
  return getContract(PATIENT_REGISTRY_ADDRESS, PatientRegistryArtifact, signerOrProvider);
}

export function getRecordRegistry(signerOrProvider) {
  assertValidAddress(RECORD_REGISTRY_ADDRESS, "RecordRegistry");
  return getContract(RECORD_REGISTRY_ADDRESS, RecordRegistryArtifact, signerOrProvider);
}

export function getAccessManager(signerOrProvider) {
  assertValidAddress(ACCESS_MANAGER_ADDRESS, "AccessManager");
  return getContract(ACCESS_MANAGER_ADDRESS, AccessManagerArtifact, signerOrProvider);
}
