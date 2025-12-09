import 'dotenv/config';

import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';
import { getOracleSnapshot } from '../lib/harvestflow-contract';
import { getNetworkConfig } from '../lib/network-config';
import { matchNFTPolicyIdWithProjects } from '../lib/project';

interface CliOptions {
  project?: string;
  policy?: string;
  limit?: number;
  network?: string;
}

function parseOptions(tokens: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith('--')) continue;
    
    // Handle --key=value format
    if (token.includes('=')) {
      const [key, value] = token.slice(2).split('=');
      switch (key) {
        case 'project':
          options.project = value;
          break;
        case 'policy':
          options.policy = value;
          break;
        case 'limit':
          options.limit = Number(value);
          break;
        case 'network':
          options.network = value;
          break;
        default:
          throw new Error(`Unknown option --${key}`);
      }
      continue;
    }
    
    // Handle --key value format
    const key = token.slice(2);
    const value = tokens[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for option ${token}`);
    }
    i += 1;
    switch (key) {
      case 'project':
        options.project = value;
        break;
      case 'policy':
        options.policy = value;
        break;
      case 'limit':
        options.limit = Number(value);
        break;
      case 'network':
        options.network = value;
        break;
      default:
        throw new Error(`Unknown option ${token}`);
    }
  }
  return options;
}

async function fetchPolicyAssets(policyId: string, blockfrostUrl: string, apiKey: string): Promise<string[]> {
  const assets: string[] = [];
  let page = 1;
  const pageSize = 100;

  for (;;) {
    const response = await fetch(`${blockfrostUrl}/assets/policy/${policyId}?page=${page}&count=${pageSize}` as RequestInfo, {
      headers: {
        project_id: apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch policy assets (status ${response.status}): ${text}`);
    }

    const chunk = (await response.json()) as Array<{ asset: string }>;
    if (!Array.isArray(chunk) || chunk.length === 0) {
      break;
    }

    for (const item of chunk) {
      assets.push(item.asset);
    }

    if (chunk.length < pageSize) {
      break;
    }

    page += 1;
  }

  return assets;
}

async function fetchAssetHolders(assetId: string, blockfrostUrl: string, apiKey: string): Promise<Array<{ address: string; quantity: string }>> {
  const response = await fetch(`${blockfrostUrl}/assets/${assetId}/addresses` as RequestInfo, {
    headers: {
      project_id: apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch holders for asset ${assetId} (status ${response.status}): ${text}`);
  }

  return (await response.json()) as Array<{ address: string; quantity: string }>;
}

async function listHolders(options: CliOptions) {
  if (!options.project && !options.policy) {
    throw new Error('Specify --project <id> or --policy <policyId>');
  }

  let projectId = options.project;
  let policyId = options.policy;

  let snapshot = projectId ? await getOracleSnapshot(projectId) : undefined;

  if (!policyId && snapshot) {
    policyId = snapshot.oracle.policyId;
  }

  if (!projectId && policyId) {
    const project = await matchNFTPolicyIdWithProjects(policyId);
    if (!project) {
      throw new Error(`No project configured for policy ${policyId}`);
    }
    projectId = project.id;
    snapshot = await getOracleSnapshot(projectId);
  }

  if (!policyId || !projectId) {
    throw new Error('Unable to determine project and policy combination from provided options');
  }
  if (!snapshot) {
    snapshot = await getOracleSnapshot(projectId);
  }
  const { oracle } = snapshot;
  const { blockfrostUrl, blockfrostApiKey } = getNetworkConfig();

  if (!blockfrostApiKey) {
    throw new Error('BLOCKFROST API key is not configured');
  }

  const assets = await fetchPolicyAssets(policyId, blockfrostUrl, blockfrostApiKey);
  const holderMap = new Map<string, { quantity: number; assets: string[] }>();

  for (const assetId of assets) {
    const holders = await fetchAssetHolders(assetId, blockfrostUrl, blockfrostApiKey).catch((error) => {
      console.warn(`Skipping asset ${assetId} due to error:`, error.message);
      return [];
    });

    for (const holder of holders) {
      const current = holderMap.get(holder.address) ?? { quantity: 0, assets: [] };
      current.quantity += Number(holder.quantity);
      current.assets.push(assetId);
      holderMap.set(holder.address, current);
    }
  }

  const rows = Array.from(holderMap.entries())
    .map(([address, info]) => ({ address, quantity: info.quantity, assets: info.assets.length }))
    .sort((a, b) => b.quantity - a.quantity);

  const limit = options.limit && options.limit > 0 ? options.limit : rows.length;

  console.log(`Policy ID: ${policyId}`);
  console.log(`Minted NFTs (oracle count): ${Number(oracle.nftIndex ?? 0)}`);
  console.log(`Holders found: ${rows.length}`);
  console.table(rows.slice(0, limit));
}

function resolveBlockfrostKey(networkId: number): { key: string; label: string } {
  if (networkId === 1) {
    if (process.env.BLOCKFROST_MAINNET_API_KEY) {
      return { key: process.env.BLOCKFROST_MAINNET_API_KEY, label: 'BLOCKFROST_MAINNET_API_KEY' };
    }
    if (process.env.BLOCKFROST_API_KEY) {
      return { key: process.env.BLOCKFROST_API_KEY, label: 'BLOCKFROST_API_KEY' };
    }
    throw new Error('Set BLOCKFROST_MAINNET_API_KEY or BLOCKFROST_API_KEY for mainnet operations.');
  }

  if (process.env.BLOCKFROST_PREPROD_API_KEY) {
    return { key: process.env.BLOCKFROST_PREPROD_API_KEY, label: 'BLOCKFROST_PREPROD_API_KEY' };
  }
  if (process.env.BLOCKFROST_API_KEY) {
    return { key: process.env.BLOCKFROST_API_KEY, label: 'BLOCKFROST_API_KEY' };
  }
  throw new Error('Set BLOCKFROST_PREPROD_API_KEY or BLOCKFROST_API_KEY for preprod operations.');
}

async function checkBalance(options: CliOptions) {
  const network = options.network || process.env.CARDANO_NETWORK || 'preprod';
  const networkId = network.toLowerCase() === 'mainnet' ? 1 : 0;
  const networkName = networkId === 1 ? 'mainnet' : 'preprod';
  
  const { key: apiKey, label: apiKeyLabel } = resolveBlockfrostKey(networkId);
  console.log(`[hf-cli] Using ${apiKeyLabel} for ${networkName}.`);

  const mnemonic = (process.env.PAYMENT_MNEMONIC || '').split(/\s+/).filter(Boolean);
  if (mnemonic.length === 0) {
    throw new Error('PAYMENT_MNEMONIC is required to build the Mesh wallet');
  }

  const parseIndex = (value: string | undefined, envName: string): number | undefined => {
    if (value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${envName} must be a non-negative integer`);
    }
    return parsed;
  };

  const accountIndex = parseIndex(process.env.PAYMENT_ACCOUNT_INDEX ?? '0', 'PAYMENT_ACCOUNT_INDEX') ?? 0;
  const addressIndex = parseIndex(process.env.PAYMENT_ADDRESS_INDEX ?? '0', 'PAYMENT_ADDRESS_INDEX') ?? 0;
  const changeIndex = parseIndex(process.env.PAYMENT_CHANGE_INDEX, 'PAYMENT_CHANGE_INDEX');
  const passphrase = process.env.PAYMENT_MNEMONIC_PASSPHRASE;

  const provider = new BlockfrostProvider(apiKey);
  const wallet = new MeshWallet({
    networkId,
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: mnemonic,
      accountIndex,
      addressIndex,
      ...(changeIndex !== undefined ? { changeIndex } : {}),
      ...(passphrase ? { passphrase } : {}),
    } as any,
  });

  const usedAddresses = await wallet.getUsedAddresses();
  const address = usedAddresses[0];
  if (!address) {
    console.log('No used addresses found for the funding wallet.');
    return;
  }
  
  const txs = await provider.fetchAddressUTxOs(address);
  const lovelace = txs.reduce((sum, utxo) => {
    const entry = utxo.output.amount.find((a) => a.unit === 'lovelace');
    return sum + (entry ? Number(entry.quantity) : 0);
  }, 0);
  
  console.log(`Address: ${address}`);
  console.log(`Total lovelace: ${lovelace}`);
  console.log(`Total ADA: ${lovelace / 1_000_000}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseOptions(rest);

  // For balance command, treat first non-option argument as network
  if (command === 'balance' && rest.length > 0) {
    const firstArg = rest[0];
    if (!firstArg.startsWith('--') && !options.network) {
      options.network = firstArg;
    }
  }

  switch (command) {
    case 'list-holders':
      await listHolders(options);
      break;
    case 'balance':
      await checkBalance(options);
      break;
    default:
      console.log('Usage: tsx scripts/hf-cli-runner.ts <command> [options]');
      console.log('Commands:');
      console.log('  list-holders --project <projectId> [--limit <n>]');
      console.log('  list-holders --policy <policyId> [--limit <n>]');
      console.log('  balance [network]');
      console.log('  balance [--network=preprod|mainnet]');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
