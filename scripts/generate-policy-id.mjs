#!/usr/bin/env node

import { ForgeScript, resolveScriptHash } from '@meshsdk/core';
import crypto from 'node:crypto';

// Generate a new policy ID for Harvestflow NFTs
function generateHarvestflowPolicyId() {
  // Use a deterministic key for the Harvestflow collection
  // This ensures the same policy ID is generated every time
  const collectionSeed = 'Harvestflow_NFT_Collection_2024';
  
  // Generate a deterministic key hash from the seed
  const keyHash = crypto.createHash('sha256')
    .update(collectionSeed)
    .digest('hex')
    .slice(0, 56); // Cardano key hashes are 28 bytes (56 hex chars)
  
  console.log('Generated key hash:', keyHash);
  
  try {
    // Create a simple native script
    const nativeScript = {
      type: 'sig',
      keyHash: keyHash
    };

    const forgingScript = ForgeScript.fromNativeScript(nativeScript);
    const policyId = resolveScriptHash(forgingScript);

    console.log('\n=== Harvestflow Policy ID ===');
    console.log('Policy ID:', policyId);
    console.log('Key Hash:', keyHash);
    console.log('Script (native):', JSON.stringify(nativeScript, null, 2));
    
    return policyId;
  } catch (error) {
    console.error('Error generating policy ID:', error);
  }
}

// Alternative: Use the treasury address to generate policy ID
function generatePolicyFromTreasury() {
  const treasuryAddress = 'addr_test1qpmp06em8fzqhkkr7q8y806r7rcpkevkh4el7s2jqqkap5axy3ly3pknqvl9xymdnahey53rwu24srklnvfc3ahngpwsyx39eu';
  
  try {
    // Extract the payment key hash from the address
    // For testnet addresses, skip the network byte and get the payment hash
    const addressHex = Buffer.from(treasuryAddress, 'utf8').toString('hex');
    console.log('Treasury address hex:', addressHex.slice(0, 100) + '...');
    
    // Use Mesh SDK to create policy
    const forgingScript = ForgeScript.withOneSignature(treasuryAddress);
    const policyId = resolveScriptHash(forgingScript);
    
    console.log('\n=== Treasury-based Policy ID ===');
    console.log('Policy ID:', policyId);
    console.log('Treasury Address:', treasuryAddress);
    console.log('Script:', forgingScript.slice(0, 100) + '...');
    
    return policyId;
  } catch (error) {
    console.error('Error with treasury-based policy:', error);
  }
}

// Generate both options
console.log('Generating Harvestflow Policy IDs...\n');
const deterministicPolicyId = generateHarvestflowPolicyId();
const treasuryPolicyId = generatePolicyFromTreasury();

console.log('\n=== Recommended Policy ID ===');
console.log('Use this policy ID in your project configuration:');
console.log(treasuryPolicyId || deterministicPolicyId);

export { generateHarvestflowPolicyId, generatePolicyFromTreasury };
