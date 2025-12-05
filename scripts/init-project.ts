#!/usr/bin/env tsx
/**
 * Initialize a new Oracle for a project
 *
 * Usage:
 *   pnpm run init <project-id>
 *
 * Example:
 *   pnpm run init 001
 *
 * This script:
 * 1. Reads project configuration from public/data/projects.json
 * 2. Boots a new Oracle with the project parameters
 * 3. Saves the paramUtxo to a project-specific file
 * 4. Updates the project's policyId
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BlockfrostProvider, MeshTxBuilder, MeshWallet, resolveScriptHash } from '@meshsdk/core';

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import nft-contracts modules (from local lib)
const HF_BACKEND_PATH = resolve(__dirname, '../lib/nft-contracts');

interface Project {
  id: string;
  title: string;
  collectionName: string;
  apy: number;
  lendingPeriod: number;
  maxMints: number;
  mintPriceLovelace: number;
  unitPrice: number;
  paramUtxoEnvKey?: string;
  policyId?: string;
  [key: string]: any;
}

interface ParamUtxo {
  txHash: string;
  outputIndex: number;
}

async function main() {
  const projectId = process.argv[2];
  const network = process.argv[3] || 'preprod'; // Default to preprod

  if (!projectId) {
    console.error('❌ Error: Project ID is required');
    console.log('\nUsage: pnpm run init <project-id> [network]');
    console.log('Example: pnpm run init 001');
    console.log('Example: pnpm run init 001 mainnet');
    console.log('\nNetwork options: preprod (default), mainnet');
    process.exit(1);
  }

  if (network !== 'preprod' && network !== 'mainnet') {
    console.error(`❌ Error: Invalid network "${network}"`);
    console.log('Valid networks: preprod, mainnet');
    process.exit(1);
  }

  console.log(`\n🚀 Initializing Oracle for project: ${projectId} on ${network}\n`);

  // Load environment variables
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = await readFile(envPath, 'utf-8');
  const env: Record<string, string> = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });

  // Load projects.json or dev-projects.json based on network
  const projectsFileName = network === 'preprod' ? 'dev-projects.json' : 'projects.json';
  const projectsPath = resolve(__dirname, '../public/data/', projectsFileName);
  const projectsData = JSON.parse(await readFile(projectsPath, 'utf-8'));
  const project: Project | undefined = projectsData.find((p: Project) => p.id === projectId);

  if (!project) {
    console.error(`❌ Error: Project with ID "${projectId}" not found in ${projectsFileName}`);
    process.exit(1);
  }

  console.log('📋 Project Configuration:');
  console.log(`   - Title: ${project.title}`);
  console.log(`   - Collection: ${project.collectionName}`);
  console.log(`   - APY: ${project.apy}%`);
  console.log(`   - Lending Period: ${project.lendingPeriod} months`);
  console.log(`   - Max Mints: ${project.maxMints}`);
  console.log(`   - Mint Price: ${project.mintPriceLovelace / 1_000_000} ADA`);
  console.log('');

  // Check required environment variables based on network
  const blockfrostKey = network === 'mainnet' ? env.BLOCKFROST_MAINNET_API_KEY : env.BLOCKFROST_API_KEY;
  const blockfrostKeyName = network === 'mainnet' ? 'BLOCKFROST_MAINNET_API_KEY' : 'BLOCKFROST_API_KEY';
  
  if (!blockfrostKey) {
    console.error(`❌ Error: ${blockfrostKeyName} is not set in .env`);
    process.exit(1);
  }

  if (!env.PAYMENT_MNEMONIC) {
    console.error('❌ Error: PAYMENT_MNEMONIC is not set in .env');
    process.exit(1);
  }

  const paymentMnemonic = env.PAYMENT_MNEMONIC.split(' ');
  if (paymentMnemonic.length !== 12 && paymentMnemonic.length !== 24) {
    console.error('❌ Error: PAYMENT_MNEMONIC must be 12 or 24 words');
    process.exit(1);
  }

  // Setup wallet and provider
  const networkId = network === 'mainnet' ? 1 : 0;

  console.log(`🔗 Using ${network} network\n`);

  const blockchainProvider = new BlockfrostProvider(blockfrostKey);
  const wallet = new MeshWallet({
    networkId,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: 'mnemonic',
      words: paymentMnemonic,
    },
  });

  await wallet.init();

  // Check and create collateral if needed
  let collateral = await wallet.getCollateral();
  if (!collateral || collateral.length === 0) {
    console.log('💼 No collateral UTxO found, creating one...\n');
    const txHash = await wallet.createCollateral();
    console.log(`📝 Collateral creation transaction submitted: ${txHash}\n`);
    console.log('⏳ Waiting for collateral confirmation (30 seconds)...\n');
    
    // Wait for collateral to be confirmed
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      collateral = await wallet.getCollateral();
      if (collateral && collateral.length > 0) {
        console.log('✅ Collateral UTxO confirmed!\n');
        break;
      }
      attempts++;
      console.log(`   Attempt ${attempts}/${maxAttempts}...`);
    }
    
    if (!collateral || collateral.length === 0) {
      throw new Error('Collateral creation transaction submitted but collateral UTxO not available yet. Please wait a few minutes and try again.');
    }
  } else {
    console.log('✅ Collateral UTxO found\n');
  }

  const walletAddress = wallet.getChangeAddress();
  console.log(`💼 Wallet Address: ${walletAddress}\n`);

  // Calculate Oracle parameters
  const lovelacePrice = project.mintPriceLovelace;

  // APY to APR: expectedApr = [numerator, denominator] = [apy, 100]
  const expectedAprNumerator = project.apy;
  const expectedAprDenominator = 100;
  const expectedApr: [number, number] = [expectedAprNumerator, expectedAprDenominator];

  // Calculate maturation time (current time + lending period in milliseconds)
  const currentTime = Date.now();
  const lendingPeriodMs = project.lendingPeriod * 30 * 24 * 60 * 60 * 1000; // months to ms
  const maturationTime = BigInt(currentTime + lendingPeriodMs);

  const maxMints = BigInt(project.maxMints);

  console.log('⚙️  Oracle Parameters:');
  console.log(`   - Lovelace Price: ${lovelacePrice} (${lovelacePrice / 1_000_000} ADA)`);
  console.log(`   - Expected APR: ${expectedAprNumerator}/${expectedAprDenominator} (${project.apy}%)`);
  console.log(`   - Maturation Time: ${new Date(Number(maturationTime)).toISOString()}`);
  console.log(`   - Max Mints: ${maxMints}`);
  console.log('');

  // Import and use nft-contracts
  console.log('📦 Loading nft-contracts...\n');

  const { MeshPlutusNFTContract } = await import(`${HF_BACKEND_PATH}/offchain.ts`);
  const { MeshPlutusNFTContract: NFTContract } = await import(`${__dirname}/../lib/nft-contracts/offchain.ts`);

  const meshTxBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true,
  });

  // Create contract instance (without paramUtxo for initial boot)
  const contract = new MeshPlutusNFTContract(
    {
      mesh: meshTxBuilder,
      fetcher: blockchainProvider,
      wallet: wallet,
      networkId,
    },
    {
      collectionName: project.collectionName,
    }
  );

  console.log('🔨 Booting Oracle...\n');

  try {
    // Boot the protocol
    const { bootProtocol } = await import(`${HF_BACKEND_PATH}/protocol.ts`);
    const { paramUtxo } = await bootProtocol(
      wallet,
      contract,
      lovelacePrice,
      expectedApr,
      maturationTime,
      maxMints
    );

    console.log('\n✅ Oracle booted successfully!\n');
    console.log('📝 ParamUtxo:');
    console.log(`   - TX Hash: ${paramUtxo.txHash}`);
    console.log(`   - Output Index: ${paramUtxo.outputIndex}`);
    console.log('');

    // Wait for transaction confirmation
    console.log('⏳ Waiting for transaction confirmation (30 seconds)...\n');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    // Enable NFT minting
    console.log('🔓 Enabling NFT minting...\n');
    
    // Re-create contract instance with paramUtxo for minting operations
    const contractWithParam = new NFTContract(
      {
        mesh: meshTxBuilder,
        fetcher: blockchainProvider,
        wallet: wallet,
        networkId,
      },
      {
        collectionName: project.collectionName,
        paramUtxo: paramUtxo,
      }
    );

    try {
      await contractWithParam.setNFTMinting(true);
      console.log('✅ NFT minting enabled successfully!\n');
    } catch (enableError) {
      console.error('⚠️  Warning: Failed to enable NFT minting:', enableError);
      console.log('You can enable minting later using the toggle-minting script or API.\n');
    }

    // Calculate policy ID
    const oracleCbor = contract.getOracleCbor();
    const policyId = resolveScriptHash(contract.getNFTCbor(), 'V3');

    console.log(`🔑 Policy ID: ${policyId}\n`);

    // Save paramUtxo to project-specific file
    const paramUtxoPath = resolve(__dirname, `../param-utxo-${projectId}.json`);
    await writeFile(
      paramUtxoPath,
      JSON.stringify(paramUtxo, null, 2),
      'utf-8'
    );
    console.log(`💾 Saved paramUtxo to: param-utxo-${projectId}.json`);

    // Update projects.json with policyId
    const updatedProject = {
      ...project,
      policyId,
    };
    const updatedProjects = projectsData.map((p: Project) =>
      p.id === projectId ? updatedProject : p
    );

    await writeFile(
      projectsPath,
      JSON.stringify(updatedProjects, null, 2),
      'utf-8'
    );
    console.log(`💾 Updated ${projectsFileName} with policyId`);

    // Update .env file with paramUtxo reference
    const paramUtxoEnvKey = project.paramUtxoEnvKey || `PARAM_UTXO_PROJECT_${projectId}`;
    const paramUtxoEnvValue = JSON.stringify(paramUtxo);

    let newEnvContent = envContent;
    const envKeyRegex = new RegExp(`^${paramUtxoEnvKey}=.*$`, 'm');

    if (envKeyRegex.test(envContent)) {
      newEnvContent = envContent.replace(envKeyRegex, `${paramUtxoEnvKey}='${paramUtxoEnvValue}'`);
    } else {
      newEnvContent += `\n${paramUtxoEnvKey}='${paramUtxoEnvValue}'\n`;
    }

    await writeFile(envPath, newEnvContent, 'utf-8');
    console.log(`💾 Updated .env with ${paramUtxoEnvKey}`);
    console.log(`\n🔍 Environment Variable Confirmation:`);
    console.log(`   ${paramUtxoEnvKey}='${paramUtxoEnvValue}'`);

    console.log('\n✨ Project initialization completed!\n');
    console.log('📋 Next steps:');
    console.log('   1. Update your frontend .env with the new policyId');
    console.log('   2. Restart your development server');
    console.log('   3. Test minting with the new project');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error booting Oracle:', error);
    process.exit(1);
  }
}

main().catch(console.error);
