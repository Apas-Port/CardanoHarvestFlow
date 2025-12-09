#!/usr/bin/env tsx
/**
 * Airdrop refund script for NFT holders
 *
 * Usage:
 *   pnpm scripts:airdrop <project-id> <network> <ada-per-nft> [--resume-from=<log-file>]
 *
 * Example:
 *   pnpm scripts:airdrop 001 preprod 10
 *   pnpm scripts:airdrop 001 mainnet 10 --resume-from=logs/airdrop-001-mainnet-20240101-120000.json
 *
 * This script:
 * 1. Fetches NFT holders for the project
 * 2. Calculates refund amount (quantity x ada-per-nft) for each holder
 * 3. Sends ADA to holders in batches (considering transaction size limits)
 * 4. Logs all transactions to a JSON file
 * 5. Supports resuming from a previous log file to skip already successful addresses
 */

import { config } from 'dotenv';
import * as path from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { BlockfrostProvider, MeshTxBuilder, MeshWallet } from '@meshsdk/core';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

interface HolderInfo {
  address: string;
  tokenIds: number[];
  quantity: number;
}

interface AirdropLog {
  timestamp: string;
  projectId: string;
  network: 'preprod' | 'mainnet';
  adaPerNft: number;
  totalHolders: number;
  totalAmount: string; // in lovelace
  transactions: TransactionLog[];
  summary: {
    successful: number;
    failed: number;
    totalSent: string; // in lovelace
  };
}

interface TransactionLog {
  txHash: string | null;
  addresses: string[];
  amounts: string[]; // in lovelace
  status: 'success' | 'failed';
  error?: string;
  timestamp: string;
}

async function getNFTHolders(
  projectId: string,
  network: 'preprod' | 'mainnet'
): Promise<HolderInfo[]> {
  // Load project data
  const projectsPath = network === 'mainnet' 
    ? './public/data/projects.json' 
    : './public/data/dev-projects.json';
  
  const projectsData = await import(path.resolve(process.cwd(), projectsPath));
  const projects = projectsData.default || projectsData;
  
  // Find project by ID
  const project = projects.find((p: any) => p.id === projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found in ${projectsPath}`);
  }

  const policyId = project.policyId;
  if (!policyId) {
    throw new Error(`No policyId found for project ${projectId}`);
  }

  // Set up Blockfrost provider
  const apiKey = network === 'mainnet' 
    ? process.env.BLOCKFROST_MAINNET_API_KEY 
    : process.env.BLOCKFROST_API_KEY;

  if (!apiKey) {
    throw new Error(`Missing Blockfrost API key for ${network}`);
  }

  // Use direct Blockfrost API call
  const baseUrl = network === 'mainnet'
    ? 'https://cardano-mainnet.blockfrost.io/api/v0'
    : 'https://cardano-preprod.blockfrost.io/api/v0';
  
  let page = 1;
  let allAssets: any[] = [];
  
  // Fetch all pages of assets
  while (true) {
    const response = await fetch(`${baseUrl}/assets/policy/${policyId}?page=${page}`, {
      headers: {
        'project_id': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.statusText}`);
    }
    
    const pageAssets = await response.json();
    
    if (!Array.isArray(pageAssets) || pageAssets.length === 0) {
      break;
    }
    
    allAssets = allAssets.concat(pageAssets);
    
    // Check if there are more pages
    if (pageAssets.length < 100) {
      break;
    }
    
    page++;
  }
  
  if (!allAssets || allAssets.length === 0) {
    return [];
  }
  
  // Group holders by address
  const holdersMap = new Map<string, HolderInfo>();

  for (const asset of allAssets) {
    const assetId = asset.asset;
    
    // Fetch addresses holding this asset
    const addressResponse = await fetch(`${baseUrl}/assets/${assetId}/addresses`, {
      headers: {
        'project_id': apiKey
      }
    });
    
    if (!addressResponse.ok) {
      console.warn(`Failed to fetch addresses for asset ${assetId}`);
      continue;
    }
    
    const addresses = await addressResponse.json();
    
    if (addresses && addresses.length > 0) {
      const holderAddress = addresses[0].address;
      
      // Extract token ID from asset name
      let tokenId = 0;
      const assetDetailResponse = await fetch(`${baseUrl}/assets/${assetId}`, {
        headers: {
          'project_id': apiKey
        }
      });
      
      if (assetDetailResponse.ok) {
        const assetDetail = await assetDetailResponse.json();
        if (assetDetail.onchain_metadata?.name) {
          const tokenMatch = assetDetail.onchain_metadata.name.match(/\((\d+)\)/);
          tokenId = tokenMatch ? parseInt(tokenMatch[1]) : 0;
        }
        
        if (tokenId === 0 && assetDetail.asset_name) {
          const hexName = assetDetail.asset_name;
          const decodedName = Buffer.from(hexName, 'hex').toString('utf8');
          const tokenMatch = decodedName.match(/\((\d+)\)/);
          tokenId = tokenMatch ? parseInt(tokenMatch[1]) : 0;
        }
      }

      // Update holder info
      let holderInfo = holdersMap.get(holderAddress);
      if (!holderInfo) {
        holderInfo = {
          address: holderAddress,
          tokenIds: [],
          quantity: 0
        };
      }
      
      holderInfo.tokenIds.push(tokenId);
      holderInfo.quantity += parseInt(addresses[0].quantity);
      holdersMap.set(holderAddress, holderInfo);
    }
  }

  return Array.from(holdersMap.values());
}

async function loadPreviousLog(logFilePath: string): Promise<Set<string>> {
  // Load previous log and extract successful addresses
  const logContent = await readFile(logFilePath, 'utf-8');
  const log: AirdropLog = JSON.parse(logContent);
  
  const successfulAddresses = new Set<string>();
  
  for (const tx of log.transactions) {
    if (tx.status === 'success' && tx.txHash) {
      for (const address of tx.addresses) {
        successfulAddresses.add(address);
      }
    }
  }
  
  return successfulAddresses;
}

async function sendBatch(
  wallet: MeshWallet,
  provider: BlockfrostProvider,
  recipients: Array<{ address: string; amountLovelace: string }>
): Promise<{ txHash: string | null; error?: string }> {
  try {
    // Get UTXOs
    const utxos = await wallet.getUtxos();
    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available');
    }

    // Get collateral
    let collateral = await wallet.getCollateral();
    if (!collateral || collateral.length === 0) {
      console.log('Creating collateral...');
      const txHash = await wallet.createCollateral();
      console.log(`Collateral creation transaction: ${txHash}`);
      
      // Wait for collateral
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        collateral = await wallet.getCollateral();
        if (collateral && collateral.length > 0) {
          break;
        }
        attempts++;
      }
      
      if (!collateral || collateral.length === 0) {
        throw new Error('Failed to create collateral');
      }
    }

    // Create new transaction builder for this batch
    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      submitter: provider,
    });

    // Build transaction with multiple outputs
    for (const recipient of recipients) {
      txBuilder.txOut(recipient.address, [
        { unit: 'lovelace', quantity: recipient.amountLovelace }
      ]);
    }

    // Set change address and UTXOs
    const changeAddress = await wallet.getChangeAddress();
    txBuilder.changeAddress(changeAddress);
    txBuilder.selectUtxosFrom(utxos);
    
    // Add collateral
    txBuilder.txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address
    );

    // Complete and sign transaction
    const unsignedTx = await txBuilder.complete();
    const signedTx = await wallet.signTx(unsignedTx, true);
    const txHash = await wallet.submitTx(signedTx);

    return { txHash };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { txHash: null, error: errorMessage };
  }
}

async function airdropRefund(
  projectId: string,
  network: 'preprod' | 'mainnet',
  adaPerNft: number,
  resumeFromLog?: string
) {
  try {
    console.log(`\n🚀 Starting airdrop refund for project ${projectId} on ${network}`);
    console.log(`   ADA per NFT: ${adaPerNft}`);
    if (resumeFromLog) {
      console.log(`   Resuming from: ${resumeFromLog}\n`);
    } else {
      console.log('');
    }

    // Check environment variables
    const blockfrostKey = network === 'mainnet' 
      ? process.env.BLOCKFROST_MAINNET_API_KEY 
      : process.env.BLOCKFROST_API_KEY;
    
    if (!blockfrostKey) {
      throw new Error(`Missing Blockfrost API key for ${network}`);
    }

    if (!process.env.PAYMENT_MNEMONIC) {
      throw new Error('PAYMENT_MNEMONIC is not set in .env');
    }

    const paymentMnemonic = process.env.PAYMENT_MNEMONIC.split(' ');
    if (paymentMnemonic.length !== 12 && paymentMnemonic.length !== 24) {
      throw new Error('PAYMENT_MNEMONIC must be 12 or 24 words');
    }

    // Load previous successful addresses if resuming
    const successfulAddresses = new Set<string>();
    if (resumeFromLog) {
      if (!existsSync(resumeFromLog)) {
        throw new Error(`Log file not found: ${resumeFromLog}`);
      }
      const previousSuccess = await loadPreviousLog(resumeFromLog);
      previousSuccess.forEach(addr => successfulAddresses.add(addr));
      console.log(`📋 Loaded ${successfulAddresses.size} previously successful addresses\n`);
    }

    // Get NFT holders
    console.log('📊 Fetching NFT holders...');
    const holders = await getNFTHolders(projectId, network);
    
    if (holders.length === 0) {
      console.log('No NFT holders found.');
      return;
    }

    // Filter out already successful addresses
    const pendingHolders = holders.filter(h => !successfulAddresses.has(h.address));
    
    console.log(`Total holders: ${holders.length}`);
    console.log(`Already processed: ${successfulAddresses.size}`);
    console.log(`Pending: ${pendingHolders.length}\n`);

    if (pendingHolders.length === 0) {
      console.log('✅ All addresses have already been processed!');
      return;
    }

    // Calculate refund amounts
    const recipients: Array<{ address: string; amountLovelace: string; quantity: number }> = [];
    let totalLovelace = BigInt(0);

    for (const holder of pendingHolders) {
      const amountLovelace = BigInt(holder.quantity) * BigInt(Math.floor(adaPerNft * 1_000_000));
      recipients.push({
        address: holder.address,
        amountLovelace: amountLovelace.toString(),
        quantity: holder.quantity
      });
      totalLovelace += amountLovelace;
    }

    console.log(`💰 Total refund amount: ${Number(totalLovelace) / 1_000_000} ADA`);
    console.log(`   (${totalLovelace.toString()} lovelace)\n`);

    // Setup wallet
    const networkId = network === 'mainnet' ? 1 : 0;
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

    // Check wallet balance
    const utxos = await wallet.getUtxos();
    let walletBalance = BigInt(0);
    for (const utxo of utxos) {
      for (const amount of utxo.output.amount) {
        if (amount.unit === 'lovelace') {
          walletBalance += BigInt(amount.quantity);
        }
      }
    }

    // Estimate transaction fees (rough estimate: 0.2 ADA per transaction)
    const estimatedFeePerTx = BigInt(200_000); // 0.2 ADA in lovelace
    const estimatedBatches = Math.ceil(recipients.length / 50); // Assume ~50 recipients per batch
    const estimatedTotalFees = estimatedFeePerTx * BigInt(estimatedBatches);
    const requiredBalance = totalLovelace + estimatedTotalFees;

    console.log(`💼 Wallet balance: ${Number(walletBalance) / 1_000_000} ADA`);
    console.log(`   Required: ${Number(requiredBalance) / 1_000_000} ADA (including estimated fees)\n`);

    if (walletBalance < requiredBalance) {
      throw new Error(
        `Insufficient balance. Need ${Number(requiredBalance) / 1_000_000} ADA, ` +
        `but have ${Number(walletBalance) / 1_000_000} ADA`
      );
    }

    // Initialize log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const logDir = path.resolve(process.cwd(), 'logs');
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }
    const logFileName = `airdrop-${projectId}-${network}-${timestamp}.json`;
    const logPath = path.resolve(logDir, logFileName);

    const log: AirdropLog = {
      timestamp: new Date().toISOString(),
      projectId,
      network,
      adaPerNft,
      totalHolders: holders.length,
      totalAmount: totalLovelace.toString(),
      transactions: [],
      summary: {
        successful: 0,
        failed: 0,
        totalSent: '0'
      }
    };

    // Process in batches (Cardano transaction size limit is ~16KB)
    // Each output is roughly 50-60 bytes, so we can fit ~200-250 outputs per transaction
    // But to be safe, we'll use 50 outputs per batch
    const BATCH_SIZE = 50;
    let totalSent = BigInt(0);
    let successfulCount = 0;
    let failedCount = 0;

    console.log(`📦 Processing ${recipients.length} recipients in batches of ${BATCH_SIZE}...\n`);

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

      console.log(`[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} recipients...`);

      const batchAddresses = batch.map(r => r.address);
      const batchAmounts = batch.map(r => r.amountLovelace);

      const result = await sendBatch(wallet, blockchainProvider, batch.map(r => ({
        address: r.address,
        amountLovelace: r.amountLovelace
      })));

      const batchTotal = batch.reduce((sum, r) => sum + BigInt(r.amountLovelace), BigInt(0));

      if (result.txHash) {
        console.log(`  ✅ Success! TX: ${result.txHash}`);
        totalSent += batchTotal;
        successfulCount += batch.length;
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
        failedCount += batch.length;
      }

      // Log transaction
      log.transactions.push({
        txHash: result.txHash,
        addresses: batchAddresses,
        amounts: batchAmounts,
        status: result.txHash ? 'success' : 'failed',
        error: result.error,
        timestamp: new Date().toISOString()
      });

      // Save log after each batch
      log.summary.successful = successfulCount;
      log.summary.failed = failedCount;
      log.summary.totalSent = totalSent.toString();
      await writeFile(logPath, JSON.stringify(log, null, 2));

      // Wait a bit between batches to avoid rate limiting
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Successful: ${successfulCount} addresses`);
    console.log(`   Failed: ${failedCount} addresses`);
    console.log(`   Total sent: ${Number(totalSent) / 1_000_000} ADA`);
    console.log(`   Log file: ${logPath}`);
    console.log('='.repeat(60) + '\n');

    if (failedCount > 0) {
      console.log(`⚠️  ${failedCount} addresses failed. You can resume using:`);
      console.log(`   pnpm scripts:airdrop ${projectId} ${network} ${adaPerNft} --resume-from=${logPath}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let resumeFromLog: string | undefined;

// Parse --resume-from option
const resumeIndex = args.findIndex(arg => arg.startsWith('--resume-from='));
if (resumeIndex >= 0) {
  resumeFromLog = args[resumeIndex].split('=')[1];
  args.splice(resumeIndex, 1);
}

if (args.length !== 3) {
  console.error('Usage: pnpm scripts:airdrop <projectId> <network> <ada-per-nft> [--resume-from=<log-file>]');
  console.error('Example: pnpm scripts:airdrop 001 preprod 10');
  console.error('Example: pnpm scripts:airdrop 001 mainnet 10 --resume-from=logs/airdrop-001-mainnet-20240101-120000.json');
  process.exit(1);
}

const [projectId, network, adaPerNftStr] = args;

if (network !== 'preprod' && network !== 'mainnet') {
  console.error('Network must be either "preprod" or "mainnet"');
  process.exit(1);
}

const adaPerNft = parseFloat(adaPerNftStr);
if (isNaN(adaPerNft) || adaPerNft <= 0) {
  console.error('ada-per-nft must be a positive number');
  process.exit(1);
}

// Run the script
airdropRefund(projectId, network, adaPerNft, resumeFromLog);

