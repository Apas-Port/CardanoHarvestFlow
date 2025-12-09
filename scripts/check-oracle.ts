#!/usr/bin/env node
/**
 * Development script to check oracle status and provide quick fixes
 * 
 * Usage:
 *   npm run check-oracle -- <projectId> [network]
 *   npm run check-oracle -- mizuki-frieren
 *   npm run check-oracle -- mizuki-frieren mainnet
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const args = process.argv.slice(2);
const projectIdRaw = args[0];
const networkArg = args[1]?.toLowerCase();

// Support both --mainnet flag and mainnet argument
const isMainnet = networkArg === 'mainnet' || args.includes('--mainnet');

if (!projectIdRaw) {
  console.error('Error: Project ID is required');
  console.log('Usage: npm run check-oracle -- <projectId> [network]');
  console.log('Example: npm run check-oracle -- mizuki-frieren');
  console.log('Example (mainnet): npm run check-oracle -- mizuki-frieren mainnet');
  process.exit(1);
}

const projectId: string = projectIdRaw;

async function checkOracle() {
  const network = isMainnet ? 'Mainnet' : 'Preprod';
  console.log('🔍 Checking Oracle Status for Project:', projectId);
  console.log('🌐 Network:', network);
  console.log('=====================================\n');

  const isDev = process.env.NODE_ENV !== 'production';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Add network parameter to explicitly specify network
  // This ensures the API uses the correct network even if env vars are not set
  const networkParam = isMainnet ? '&network=mainnet' : '&network=preprod';

  try {
    // 1. Check mint endpoint status
    console.log('1️⃣  Checking Mint API Status...');
    const mintStatusResponse = await fetch(`${baseUrl}/api/cardano/mint?projectId=${projectId}${networkParam}`);
    const mintStatus = await mintStatusResponse.json();

    if (mintStatusResponse.ok) {
      console.log('✅ Oracle Found!');
      console.log(`   - Current Token ID: ${mintStatus.currentTokenId}`);
      console.log(`   - Max Mints: ${mintStatus.maxMints}`);
      console.log(`   - Minting Allowed: ${mintStatus.mintingAllowed ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Policy ID: ${mintStatus.policyId}`);
      console.log(`   - Price: ${mintStatus.lovelacePrice / 1_000_000} ADA`);
    } else {
      console.error('❌ Oracle Error:', mintStatus.error);
      console.error('   Status Code:', mintStatusResponse.status);
      if (mintStatus.details) {
        console.error('   Details:', JSON.stringify(mintStatus.details, null, 2));
      }
      if (mintStatus.error && mintStatus.error.includes('Oracle UTxO not found')) {
        console.log('\n⚠️  Oracle needs to be initialized!');
        console.log('   Run: npm run init -- --project=' + projectId);
      } else if (mintStatus.error && mintStatus.error.includes('Project not found')) {
        console.log('\n⚠️  Project not found!');
        const projectFile = isMainnet ? 'projects.json' : 'dev-projects.json';
        console.log(`   Check if project ID "${projectId}" exists in ${projectFile}`);
      } else if (mintStatus.error && mintStatus.error.includes('Failed to fetch oracle data')) {
        console.log('\n⚠️  Failed to fetch oracle data!');
        console.log('   This might indicate:');
        console.log('   1. Oracle UTxO not found (Oracle not initialized)');
        console.log('   2. Network configuration issue');
        console.log('   3. Blockfrost API issue');
        if (mintStatus.details) {
          console.log('   Oracle Address:', mintStatus.details.oracleAddress);
          console.log('   Network:', mintStatus.details.network);
        }
        console.log('   Try running: npm run init -- --project=' + projectId);
      }
      return;
    }

    // 2. Check toggle-minting endpoint
    console.log('\n2️⃣  Checking Toggle Minting Status...');
    const toggleStatusResponse = await fetch(`${baseUrl}/api/cardano/toggle-minting?projectId=${projectId}${networkParam}`);
    const toggleStatus = await toggleStatusResponse.json();

    if (toggleStatusResponse.ok) {
      console.log('✅ Toggle Minting API accessible');
      console.log(`   - Fee Collector: ${toggleStatus.feeCollectorAddress}`);
    }

    // 3. If minting is disabled, provide solutions
    if (!mintStatus.mintingAllowed) {
      console.log('\n⚠️  MINTING IS DISABLED! Here are your options:\n');

      console.log('Option 1: Quick Fix for Development (Recommended)');
      console.log('------------------------------------------------');
      console.log('Add this to your .env.local file:');
      console.log(`OVERRIDE_MINT_CHECK=true`);
      console.log('\nThen restart your dev server. This will bypass the minting check in development.\n');

      console.log('Option 2: Re-initialize Oracle with Minting Enabled');
      console.log('---------------------------------------------------');
      console.log('If you control the oracle, you can reinitialize it:');
      console.log(`npm run init -- --project=${projectId} --reset\n`);

      console.log('Option 3: Use Admin Wallet to Enable');
      console.log('------------------------------------');
      console.log('If you have the admin wallet that controls:', toggleStatus.feeCollectorAddress);
      console.log('You can enable minting by calling the setNFTMinting function.\n');

      // Create a dev override file
      if (isDev && !isMainnet) {
        console.log('💡 Creating development override file...');
        await createDevOverride(projectId);
      }
    } else {
      console.log('\n✅ Minting is ENABLED! You should be able to mint NFTs.');
    }

  } catch (error) {
    console.error('\n❌ Error checking oracle:', error);
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  Is your Next.js dev server running?');
      console.log('   Run: npm run dev');
    }
  }
}

async function createDevOverride(projectId: string) {
  // Create a simple override mechanism for development
  const overrideContent = `
# Development Override for NFT Minting
# This file is created by check-oracle.ts for development purposes

# Override minting check in development
OVERRIDE_MINT_CHECK=true

# Project-specific overrides
DEV_MINT_OVERRIDE_${projectId.toUpperCase().replace(/-/g, '_')}=true
`;

  try {
    const fs = await import('fs/promises');
    const envPath = resolve(process.cwd(), '.env.development.local');
    
    // Check if file exists
    try {
      const existing = await fs.readFile(envPath, 'utf-8');
      if (!existing.includes('OVERRIDE_MINT_CHECK')) {
        await fs.writeFile(envPath, existing + overrideContent);
        console.log('✅ Added override to .env.development.local');
      } else {
        console.log('ℹ️  Override already exists in .env.development.local');
      }
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(envPath, overrideContent);
      console.log('✅ Created .env.development.local with override');
    }

    console.log('\n🔄 Please restart your dev server for changes to take effect!');
    console.log('   Press Ctrl+C and run: npm run dev\n');

  } catch (error) {
    console.error('Failed to create override file:', error);
  }
}

// Run the check
checkOracle();