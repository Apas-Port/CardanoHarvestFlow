#!/usr/bin/env node

/**
 * Generate a unique Policy ID for Mainnet deployment
 * This script generates a time-based Policy ID that will be different from preprod
 */

import crypto from 'node:crypto';

// Generate a unique policy ID based on timestamp and random bytes
function generateMainnetPolicyId() {
  // Create a unique identifier using:
  // 1. "mainnet" prefix to distinguish from preprod
  // 2. Current timestamp
  // 3. Random bytes for uniqueness

  const prefix = 'mainnet';
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(16).toString('hex');

  // Combine all parts and hash them
  const combined = `${prefix}-${timestamp}-${randomBytes}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');

  // Take the first 56 characters (standard Cardano policy ID length)
  // Cardano policy IDs are typically 56 characters (28 bytes in hex)
  const policyId = hash.substring(0, 56);

  return policyId;
}

// Generate mainnet policy ID
const mainnetPolicyId = generateMainnetPolicyId();

console.log('Generated Mainnet Policy ID:');
console.log('========================================');
console.log(mainnetPolicyId);
console.log('========================================');
console.log('');
console.log('This policy ID is unique to mainnet and will not conflict with preprod.');
console.log('Add this to your projects.json file for mainnet deployment.');
console.log('');
console.log('Note: For production use, you should generate a proper policy using');
console.log('Cardano CLI or the Mesh SDK with your treasury wallet address.');

export { generateMainnetPolicyId };
