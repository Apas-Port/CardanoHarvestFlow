#!/usr/bin/env tsx

import { config } from 'dotenv';
import * as path from 'path';
import { BlockfrostProvider } from '@meshsdk/core';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

interface HolderInfo {
  address: string;
  tokenIds: number[];
  quantity: number;
}

async function listNFTHolders(projectId: string, network: 'preprod' | 'mainnet') {
  try {
    console.log(`\nFetching NFT holders for project ${projectId} on ${network}...\n`);

    // Load project data
    const projectsPath = network === 'mainnet' 
      ? './public/data/projects.json' 
      : './public/data/dev-projects.json';
    
    const projectsData = await import(path.resolve(process.cwd(), projectsPath));
    const projects = projectsData.default || projectsData;
    
    // Find project by ID
    const project = projects.find((p: any) => p.id === projectId);
    if (!project) {
      console.error(`Project ${projectId} not found in ${projectsPath}`);
      process.exit(1);
    }

    const policyId = project.policyId;
    if (!policyId) {
      console.error(`No policyId found for project ${projectId}`);
      process.exit(1);
    }

    console.log(`Project: ${project.title}`);
    console.log(`Policy ID: ${policyId}`);
    console.log(`Collection: ${project.collectionName || project.title}\n`);

    // Set up Blockfrost provider
    const apiKey = network === 'mainnet' 
      ? process.env.BLOCKFROST_MAINNET_API_KEY 
      : process.env.BLOCKFROST_API_KEY;

    if (!apiKey) {
      console.error(`Missing Blockfrost API key for ${network}`);
      process.exit(1);
    }

    const blockfrost = new BlockfrostProvider(apiKey);

    // Fetch all assets for the policy
    console.log('Fetching assets...');
    
    // Use direct Blockfrost API call since fetchAssetsByPolicyId is not available
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
    
    const assets = allAssets;
    
    if (!assets || assets.length === 0) {
      console.log('No NFTs minted yet for this project.');
      return;
    }

    console.log(`Found ${assets.length} NFTs\n`);
    
    // Group holders by address
    const holdersMap = new Map<string, HolderInfo>();

    for (const asset of assets) {
      const assetId = asset.asset;
      
      // Fetch detailed asset information
      const assetDetailResponse = await fetch(`${baseUrl}/assets/${assetId}`, {
        headers: {
          'project_id': apiKey
        }
      });
      
      if (!assetDetailResponse.ok) {
        console.warn(`Failed to fetch asset details for ${assetId}`);
        continue;
      }
      
      const assetDetail = await assetDetailResponse.json();
      
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
        // Usually there's only one holder per NFT
        const holderAddress = addresses[0].address;
        
        // Extract token ID from asset name
        // First try the onchain metadata name
        let tokenId = 0;
        if (assetDetail.onchain_metadata?.name) {
          const tokenMatch = assetDetail.onchain_metadata.name.match(/\((\d+)\)/);
          tokenId = tokenMatch ? parseInt(tokenMatch[1]) : 0;
        }
        
        // If not found, try the asset_name field
        if (tokenId === 0 && assetDetail.asset_name) {
          // Decode hex asset name
          const hexName = assetDetail.asset_name;
          const decodedName = Buffer.from(hexName, 'hex').toString('utf8');
          const tokenMatch = decodedName.match(/\((\d+)\)/);
          tokenId = tokenMatch ? parseInt(tokenMatch[1]) : 0;
        }

        // Update holder info
        const holderInfo = holdersMap.get(holderAddress) || {
          address: holderAddress,
          tokenIds: [],
          quantity: 0
        };
        
        holderInfo.tokenIds.push(tokenId);
        holderInfo.quantity += parseInt(addresses[0].quantity);
        holdersMap.set(holderAddress, holderInfo);
      }
    }

    // Convert to array and sort by quantity
    const holders = Array.from(holdersMap.values())
      .sort((a, b) => b.quantity - a.quantity);

    // Display results
    console.log('='.repeat(120));
    console.log(`${'Address'.padEnd(105)} | ${'Token IDs'.padEnd(30)} | Quantity`);
    console.log('='.repeat(120));

    for (const holder of holders) {
      const tokenIdsStr = holder.tokenIds.sort((a, b) => a - b).join(', ');
      const truncatedIds = tokenIdsStr.length > 28 
        ? tokenIdsStr.substring(0, 25) + '...' 
        : tokenIdsStr;
      
      console.log(
        `${holder.address.padEnd(105)} | ${truncatedIds.padEnd(30)} | ${holder.quantity}`
      );
    }

    console.log('='.repeat(120));
    console.log(`\nTotal holders: ${holders.length}`);
    console.log(`Total NFTs: ${assets.length}`);

    // Summary statistics
    const avgPerHolder = (assets.length / holders.length).toFixed(2);
    const maxHolder = holders[0];
    
    console.log(`\nStatistics:`);
    console.log(`- Average NFTs per holder: ${avgPerHolder}`);
    if (maxHolder) {
      console.log(`- Largest holder: ${maxHolder.address} (${maxHolder.quantity} NFTs)`);
    }

  } catch (error) {
    console.error('Error fetching NFT holders:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: pnpm scripts:list <projectId> <network>');
  console.error('Example: pnpm scripts:list 001 preprod');
  console.error('Example: pnpm scripts:list 002 mainnet');
  process.exit(1);
}

const [projectId, network] = args;

if (network !== 'preprod' && network !== 'mainnet') {
  console.error('Network must be either "preprod" or "mainnet"');
  process.exit(1);
}

// Run the script
listNFTHolders(projectId, network);