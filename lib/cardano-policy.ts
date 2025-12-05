import { getNetworkConfig } from './network-config';

// Cardano Policy Configuration for Harvestflow NFTs

// This policy script defines the minting rules for Harvestflow NFTs
// The policy ensures that NFTs follow the naming convention: "Harvestflow#{token_id}"
export const HARVESTFLOW_COLLECTION_NAME = "Harvestflow";

// Generate asset name with the format "Harvestflow#{token_id}"
export function generateHarvestflowAssetName(tokenId: number): string {
  return `${HARVESTFLOW_COLLECTION_NAME}#${tokenId}`;
}

// Policy script parameters from HF-cardano-backend
export const HARVESTFLOW_POLICY_CONFIG = {
  // Collection name used in the smart contract
  collectionName: HARVESTFLOW_COLLECTION_NAME,
  
  // Oracle NFT policy ID (if using oracle-based minting)
  oracleNftPolicyId: process.env.ORACLE_NFT_POLICY_ID || "",
  
  // Maximum number of NFTs that can be minted
  maxMints: 10000,
  
  // Initial token ID counter
  initialCount: 1,
  
  // Network configuration
  network: getNetworkConfig().network,
};

// Policy script CBOR (compiled from Aiken)
// This would be the compiled version of the plutus_nft.ak with modified asset naming
export const HARVESTFLOW_POLICY_SCRIPT = `{
  "type": "PlutusV2",
  "script": "COMPILED_SCRIPT_CBOR_HERE"
}`;

// Helper function to get policy ID from script
export function getHarvestflowPolicyId(): string {
  // Policy ID generated from treasury address
  return process.env.HARVESTFLOW_POLICY_ID || "5b1a3dc00d40b402a72f72b9a5f0c1197e9ddc50a7366a68d719e653";
}