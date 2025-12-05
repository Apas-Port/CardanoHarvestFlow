#!/usr/bin/env node
/**
 * Script to enable or disable NFT minting for a project
 * 
 * Usage:
 *   npm run toggle-minting -- --project=<projectId> --enable
 *   npm run toggle-minting -- --project=<projectId> --disable
 *   npm run toggle-minting -- --project=<projectId> --status
 * 
 * Examples:
 *   npm run toggle-minting -- --project=mizuki-frieren --enable
 *   npm run toggle-minting -- --project=mizuki-frieren --status
 */

import { BrowserWallet } from '@meshsdk/core';
import { BlockfrostProvider } from '@meshsdk/core';
import { MeshTxBuilder } from '@meshsdk/core';
import { MeshPlutusNFTContract } from '../lib/nft-contracts/offchain';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const projectId = args.find(arg => arg.startsWith('--project='))?.split('=')[1];
const enable = args.includes('--enable');
const disable = args.includes('--disable');
const checkStatus = args.includes('--status');

if (!projectId) {
  console.error('Error: Project ID is required');
  console.log('Usage: npm run toggle-minting -- --project=<projectId> [--enable|--disable|--status]');
  process.exit(1);
}

if (!enable && !disable && !checkStatus) {
  console.error('Error: You must specify --enable, --disable, or --status');
  process.exit(1);
}

async function main() {
  try {
    console.log(`Project: ${projectId}`);
    
    // Get network configuration
    const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
    const blockfrostApiKey = process.env.BLOCKFROST_API_KEY;
    
    if (!blockfrostApiKey) {
      console.error('Error: BLOCKFROST_API_KEY not found in environment variables');
      process.exit(1);
    }

    // Initialize Blockfrost provider
    const provider = new BlockfrostProvider(
      blockfrostApiKey,
      isMainnet ? 1 : 0 // 1 for mainnet, 0 for preprod/testnet
    );

    // Load project data to get paramUtxo and collection name
    const projectsPath = resolve(process.cwd(), isMainnet ? 'public/data/projects.json' : 'public/data/dev-projects.json');
    const { readFileSync } = await import('fs');
    const projects = JSON.parse(readFileSync(projectsPath, 'utf8'));
    const project = projects.find((p: any) => p.id === projectId);
    
    if (!project) {
      console.error(`Error: Project "${projectId}" not found`);
      process.exit(1);
    }

    // Get paramUtxo from environment using paramUtxoEnvKey
    let paramUtxo;
    if (project.paramUtxoEnvKey) {
      const paramUtxoStr = process.env[project.paramUtxoEnvKey];
      if (paramUtxoStr) {
        paramUtxo = JSON.parse(paramUtxoStr);
      }
    }
    
    if (!paramUtxo) {
      console.error('Error: Project does not have paramUtxo configured');
      console.error(`Looked for environment variable: ${project.paramUtxoEnvKey}`);
      process.exit(1);
    }

    // Initialize contract
    const contract = new MeshPlutusNFTContract(
      {
        mesh: new MeshTxBuilder({
          fetcher: provider,
          submitter: provider,
          evaluator: provider,
        }),
        fetcher: provider,
        wallet: undefined, // We'll set this if needed for enable/disable
        networkId: isMainnet ? 1 : 0,
      },
      {
        collectionName: project.collectionName || project.title,
        paramUtxo: {
          txHash: paramUtxo.txHash,
          outputIndex: paramUtxo.outputIndex
        }
      }
    );

    // Get current oracle data
    console.log('Fetching oracle data...');
    const oracleData = await contract.getOracleData();
    
    // Check current minting status (handle different Bool formats)
    let currentMintingStatus = false;
    if (typeof oracleData.nftMintAllowed === 'boolean') {
      currentMintingStatus = oracleData.nftMintAllowed;
    } else if (oracleData.nftMintAllowed && typeof oracleData.nftMintAllowed === 'object') {
      currentMintingStatus = (oracleData.nftMintAllowed as any).bool === true;
    }
    
    console.log('\nCurrent Status:');
    console.log(`- Minting Enabled: ${currentMintingStatus}`);
    console.log(`- Current Index: ${oracleData.nftIndex}`);
    console.log(`- Max Mints: ${oracleData.maxMints}`);
    console.log(`- Fee Collector: ${oracleData.feeCollectorAddress}`);

    if (checkStatus) {
      // Just checking status, we're done
      process.exit(0);
    }

    // For enable/disable, we need wallet access
    if (enable || disable) {
      console.log('\n⚠️  To enable/disable minting, you need access to the admin wallet.');
      console.log('The admin wallet must control the fee_address:', oracleData.feeCollectorAddress);
      
      console.log('\nOptions:');
      console.log('1. Configure server wallet with admin credentials');
      console.log('2. Use a browser-based admin interface with wallet connection');
      console.log('3. Manually build and sign the transaction with your wallet');
      
      console.log('\nTransaction that would be built:');
      console.log(`- Action: ${enable ? 'EnableNFTMinting' : 'DisableNFTMinting'}`);
      console.log(`- Requires signature from: ${oracleData.feeCollectorAddress}`);
      console.log(`- Updates oracle datum at: ${contract.oracleAddress}`);
      
      // If you have wallet access, uncomment and configure the following:
      /*
      // Example with wallet seed phrase (DO NOT COMMIT!)
      const walletSeed = process.env.ADMIN_WALLET_SEED;
      if (walletSeed) {
        const wallet = new MeshWallet({
          networkId: isMainnet ? 1 : 0,
          fetcher: provider,
          submitter: provider,
          key: {
            type: 'mnemonic',
            words: walletSeed.split(' '),
          },
        });
        
        // Update contract with wallet
        contract.mesh = new MeshTxBuilder({
          fetcher: provider,
          submitter: provider,
          evaluator: provider,
        });
        contract.wallet = wallet;
        
        console.log('\nBuilding transaction...');
        const txHash = await contract.setNFTMinting(enable);
        console.log(`✅ Transaction submitted: ${txHash}`);
        console.log(`Minting is now ${enable ? 'ENABLED' : 'DISABLED'}`);
      }
      */
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();