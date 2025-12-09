#!/usr/bin/env node
require('dotenv/config');

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');

/**
 * Ensure we always evaluate env variables relative to the frontend repo root.
 */
function loadEnvFiles() {
  const dotenv = require('dotenv');
  ['.env.local', '.env'].forEach((file) => {
    const candidate = path.join(ROOT_DIR, file);
    dotenv.config({ path: candidate, override: true });
  });
}

loadEnvFiles();

const externalBackendDir = path.join(ROOT_DIR, '..', 'HF-cardano-backend');
const embeddedBackendDir = path.join(ROOT_DIR, 'lib', 'nft-contracts');

const backendDir = fsSync.existsSync(path.join(externalBackendDir, 'offchain.ts'))
  ? externalBackendDir
  : embeddedBackendDir;

const tsNode = require('ts-node');
const backendTsconfigPath = path.join(backendDir, 'tsconfig.json');
const tsNodeOptions = fsSync.existsSync(backendTsconfigPath)
  ? { project: backendTsconfigPath }
  : { compilerOptions: { module: 'commonjs', moduleResolution: 'node' } };
tsNode.register({ transpileOnly: true, ...tsNodeOptions });

const { BlockfrostProvider, MeshTxBuilder, MeshWallet, resolveScriptHash } = require('@meshsdk/core');
const { BlockFrostAPI } = require('@blockfrost/blockfrost-js');
const { MeshPlutusNFTContract } = require(path.join(backendDir, 'offchain.ts'));
const { bootProtocol } = require(path.join(backendDir, 'protocol.ts'));

/** @typedef {'init' | 'o' | 'l' | 'lh' | 'em' | 'dm' | 'balance'} Command */

function resolveNetworkId(source) {
  const value = source ?? process.env.CARDANO_NETWORK;
  if (!value) return 0;
  return value.toLowerCase() === 'mainnet' ? 1 : 0;
}

function resolveBlockfrostKey(networkId) {
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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unwrapQuoted(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === last) && (first === '"' || first === '\'')) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

async function ensureCollateral(wallet, attempts = 10, delayMs = 3000) {
  let collaterals = await wallet.getCollateral();
  if (collaterals && collaterals.length > 0) {
    return collaterals[0];
  }

  console.log('[hf-cli] No collateral UTxO detected; creating collateral.');
  const txHash = await wallet.createCollateral();
  console.log(`[hf-cli] Collateral transaction submitted: ${txHash}`);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(delayMs);
    collaterals = await wallet.getCollateral();
    if (collaterals && collaterals.length > 0) {
      console.log('[hf-cli] Collateral UTxO detected.');
      return collaterals[0];
    }
    console.log('[hf-cli] Waiting for collateral confirmation...');
  }

  throw new Error('Collateral creation was submitted but UTxO not detected yet. Try again once the transaction is confirmed.');
}

async function readParamUtxoFromPath(pathLike) {
  const resolved = path.isAbsolute(pathLike) ? pathLike : path.join(ROOT_DIR, pathLike);
  const raw = await fs.readFile(resolved, 'utf8');
  return JSON.parse(raw);
}

async function parseParamUtxoPayload(raw) {
  const candidate = raw ? unwrapQuoted(raw) : '';
  if (!candidate) return undefined;
  try {
    return JSON.parse(candidate);
  } catch (parseError) {
    // Treat as a file path fallback
    return await readParamUtxoFromPath(candidate);
  }
}

async function persistParamUtxo(paramUtxo, { pathLike, envKey }) {
  const serialized = JSON.stringify(paramUtxo, null, 2);

  if (pathLike) {
    const targetPath = path.isAbsolute(pathLike) ? pathLike : path.join(ROOT_DIR, pathLike);
    await fs.writeFile(targetPath, serialized, 'utf8');
    console.log(`paramUtxo saved to ${targetPath}.`);
  }

  if (envKey) {
    console.log(`[hf-cli] Export the following environment variable:`);
    console.log(`${envKey}='${serialized.replace(/'/g, "'\\''")}'`);
  }

  if (!pathLike && !envKey) {
    console.log('paramUtxo payload:');
    console.log(serialized);
  }
}

function resolveParamTargets({ project, paramEnvKeyOverride }) {
  const envKey = paramEnvKeyOverride
    || (project?.paramUtxoEnvKey ? project.paramUtxoEnvKey.trim() : undefined)
    || (process.env.PARAM_UTXO_ENV_KEY ? process.env.PARAM_UTXO_ENV_KEY.trim() : undefined);

  const pathLike = process.env.PARAM_UTXO_PATH ? process.env.PARAM_UTXO_PATH.trim() : undefined;
  return { envKey, pathLike };
}

async function loadProjectMetadata(projectId, networkId) {
  if (!projectId) {
    return null;
  }

  const fileName = networkId === 1 ? 'projects.json' : 'dev-projects.json';
  const filePath = path.join(DATA_DIR, fileName);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const projects = JSON.parse(raw);
    if (!Array.isArray(projects)) {
      throw new Error(`Unexpected project data format in ${fileName}`);
    }

    const index = projects.findIndex((p) =>
      typeof p?.id === 'string' && p.id.toLowerCase() === projectId.toLowerCase(),
    );

    if (index === -1) {
      throw new Error(`Project ${projectId} not found in ${fileName}`);
    }

    const project = projects[index];

    return { project, filePath, projects, index };
  } catch (error) {
    console.error(`[hf-cli] Failed to load project metadata from ${fileName}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function updateProjectPolicyId(metadata, newPolicyId) {
  if (!metadata) {
    return;
  }

  const { project, projects, index, filePath } = metadata;

  if (project.policyId === newPolicyId) {
    return;
  }

  project.policyId = newPolicyId;
  projects[index] = project;

  const serialized = `${JSON.stringify(projects, null, 2)}\n`;
  await fs.writeFile(filePath, serialized, 'utf8');
  console.log(`[hf-cli] Updated ${path.basename(filePath)} policyId to ${newPolicyId}.`);
}

async function buildWalletAndContract({ requireParamUtxo, networkId, project, paramEnvKeyOverride, ensureCollateralUtxo }) {
  const { key: apiKey, label: apiKeyLabel } = resolveBlockfrostKey(networkId);
  const networkName = networkId === 1 ? 'mainnet' : 'preprod';
  console.log(`[hf-cli] Using ${apiKeyLabel} for ${networkName}.`);

  const collectionName = process.env.COLLECTION_NAME
    || project?.collectionName
    || project?.title;

  if (!collectionName) {
    throw new Error('Set COLLECTION_NAME or provide a project with collectionName/title');
  }

  const provider = new BlockfrostProvider(apiKey);
  const mesh = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  const mnemonic = (process.env.PAYMENT_MNEMONIC || '').split(/\s+/).filter(Boolean);
  if (mnemonic.length === 0) {
    throw new Error('PAYMENT_MNEMONIC is required to build the Mesh wallet');
  }

  const parseIndex = (value, envName) => {
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
    },
  });

  if (ensureCollateralUtxo) {
    await ensureCollateral(wallet);
  }

  const { envKey: paramEnvKey, pathLike: paramPath } = resolveParamTargets({ project, paramEnvKeyOverride });

  let paramUtxo;
  if (paramEnvKey && process.env[paramEnvKey]) {
    paramUtxo = await parseParamUtxoPayload(process.env[paramEnvKey]);
  }

  if (!paramUtxo && paramPath) {
    paramUtxo = await readParamUtxoFromPath(paramPath);
  }

  if (requireParamUtxo && !paramUtxo) {
    if (paramEnvKey) {
      throw new Error(`Environment variable ${paramEnvKey} is required for this command`);
    }
    if (paramPath) {
      throw new Error(`Could not load paramUtxo from ${paramPath}`);
    }
    throw new Error('paramUtxo source not configured. Use PARAM_UTXO_ENV_KEY or PARAM_UTXO_PATH.');
  }

  const contract = new MeshPlutusNFTContract(
    {
      mesh,
      fetcher: provider,
      wallet,
      networkId,
    },
    {
      collectionName,
      ...(paramUtxo ? { paramUtxo } : {}),
    },
  );

  return { contract, wallet, provider, apiKey, paramEnvKey, paramPath };
}

async function handleBalance(networkId, shared) {
  const { wallet, provider } = await buildWalletAndContract({
    requireParamUtxo: false,
    networkId,
    project: shared.project,
    paramEnvKeyOverride: shared.paramEnvKey,
    ensureCollateralUtxo: false,
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

async function handleInit(networkId, shared) {
  const { wallet, contract, paramEnvKey, paramPath } = await buildWalletAndContract({
    requireParamUtxo: false,
    networkId,
    project: shared.project,
    paramEnvKeyOverride: shared.paramEnvKey,
    ensureCollateralUtxo: true,
  });

  // Load parameters from project JSON (preferred) or fallback to environment variables
  const project = shared.project;
  
  if (!project) {
    throw new Error('Project is required. Use --project-id=<projectId> or set project configuration in projects.json');
  }

  const lovelacePrice = project.mintPriceLovelace 
    ? Number(project.mintPriceLovelace)
    : Number(requireEnv('FEE_PRICE_LOVELACE'));
  
  // APY to APR: expectedApr = [numerator, denominator] = [apy, 100]
  const expectedAprNumerator = project.apy !== undefined
    ? Number(project.apy)
    : Number(requireEnv('EXPECTED_APR_NUMERATOR'));
  const expectedAprDenominator = 100; // Always use 100 as denominator when using APY from project
  
  // Calculate maturation time from lending period or use env value
  let maturationTime;
  if (project.lendingPeriod !== undefined) {
    const currentTime = Date.now();
    const lendingPeriodMs = Number(project.lendingPeriod) * 30 * 24 * 60 * 60 * 1000; // months to ms
    maturationTime = BigInt(currentTime + lendingPeriodMs);
  } else {
    maturationTime = BigInt(requireEnv('MATURATION_TIME'));
  }
  
  const maxMints = project.maxMints !== undefined
    ? BigInt(project.maxMints)
    : BigInt(requireEnv('MAX_MINTS'));

  console.log('Booting protocol with settings:', {
    lovelacePrice,
    expectedAprNumerator,
    expectedAprDenominator,
    maturationTime: maturationTime.toString(),
    maxMints: maxMints.toString(),
    source: project ? 'project.json' : 'environment variables',
  });

  const { paramUtxo } = await bootProtocol(
    wallet,
    contract,
    lovelacePrice,
    [expectedAprNumerator, expectedAprDenominator],
    maturationTime,
    maxMints,
  );

  await persistParamUtxo(paramUtxo, { pathLike: paramPath, envKey: paramEnvKey });
  if (!paramEnvKey) {
    console.log('Tip: set PARAM_UTXO_ENV_KEY (or use --param-env / project paramUtxoEnvKey) to load the paramUtxo from environment variables.');
  }
  try {
    const policyId = resolveScriptHash(contract.getNFTCbor(), 'V3');
    await updateProjectPolicyId(shared.projectMeta, policyId);
    if (shared.project) {
      shared.project.policyId = policyId;
    }
  } catch (error) {
    console.warn('[hf-cli] Unable to update project policyId:', error instanceof Error ? error.message : error);
  }
  console.log('Note: booting the protocol submits a transaction and consumes ADA for collateral/fees.');
}

async function handleOracle(networkId, shared) {
  const { contract } = await buildWalletAndContract({
    requireParamUtxo: true,
    networkId,
    project: shared.project,
    paramEnvKeyOverride: shared.paramEnvKey,
    ensureCollateralUtxo: false,
  });
  const data = await contract.getOracleData();
  console.log(JSON.stringify(data, null, 2));
}

async function handleList(networkId, shared) {
  const { contract, wallet } = await buildWalletAndContract({
    requireParamUtxo: true,
    networkId,
    project: shared.project,
    paramEnvKeyOverride: shared.paramEnvKey,
    ensureCollateralUtxo: false,
  });
  const usedAddresses = await wallet.getUsedAddresses();
  const address = usedAddresses[0];
  if (!address) {
    console.log('No used addresses found for the funding wallet.');
    return;
  }
  const nfts = await contract.getAllPlutusNFTsAtAddress(address);
  console.log(`NFTs held by ${address}`);
  console.log(JSON.stringify(nfts, null, 2));
}

async function handleListHolders(networkId, shared) {
  const { contract, apiKey } = await buildWalletAndContract({
    requireParamUtxo: true,
    networkId,
    project: shared.project,
    paramEnvKeyOverride: shared.paramEnvKey,
    ensureCollateralUtxo: false,
  });
  const api = new BlockFrostAPI({ projectId: apiKey });
  let policyId = shared.project?.policyId;

  if (policyId) {
    console.log(`[hf-cli] Using project policyId ${policyId} for holder lookup.`);
  } else if (contract?.getNFTCbor) {
    try {
      policyId = resolveScriptHash(contract.getNFTCbor(), 'V3');
      console.log(`[hf-cli] Derived policy ID: ${policyId}`);
    } catch (err) {
      console.warn('[hf-cli] Could not resolve policy ID:', err instanceof Error ? err.message : err);
    }
  }

  if (!policyId) {
    console.error('[hf-cli] Unable to determine policy ID for holder lookup.');
    return;
  }

  const summary = {};
  let page = 1;
  const pageSize = 100;

  while (true) {
    const assets = await api.assetsPolicyById(policyId, { page, count: pageSize });
    if (!Array.isArray(assets) || assets.length === 0) {
      break;
    }

    for (const asset of assets) {
      const addresses = await api.assetsAddresses(asset.asset);
      summary[asset.asset] = addresses.map((entry) => entry.address);
    }

    if (assets.length < pageSize) {
      break;
    }
    page += 1;
  }

  console.log(JSON.stringify(summary, null, 2));
}

async function toggleMinting(enabled, networkId, shared) {
  const { contract, wallet } = await buildWalletAndContract({
    requireParamUtxo: true,
    networkId,
    project: shared.project,
    paramEnvKeyOverride: shared.paramEnvKey,
    ensureCollateralUtxo: true,
  });
  const txHex = await contract.setNFTMinting(enabled);
  const signed = await wallet.signTx(txHex);
  const txHash = await wallet.submitTx(signed);
  console.log(`${enabled ? 'Enabled' : 'Disabled'} minting. Tx hash: ${txHash}`);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');

  const remaining = [];
  let networkValue;
  let projectId;
  let paramEnvKey;

  for (const arg of args) {
    if (arg.startsWith('--network=')) {
      networkValue = arg.split('=')[1];
    } else if (arg.startsWith('--project-id=')) {
      projectId = arg.split('=')[1];
    } else if (arg.startsWith('--param-env=')) {
      paramEnvKey = arg.split('=')[1];
    } else {
      remaining.push(arg);
    }
  }

  const networkId = resolveNetworkId(networkValue);

  /** @type {Command | undefined} */
  const command = remaining[0];

  if (!command || !['init', 'o', 'l', 'lh', 'em', 'dm', 'balance'].includes(command)) {
    console.log('Usage: node hf-cli.ts <init|o|l|lh|em|dm|balance> [--network=preprod|mainnet] [--project-id=...] [--param-env=ENV_KEY]');
    process.exitCode = 1;
    return;
  }

  try {
    const projectMeta = projectId ? await loadProjectMetadata(projectId, networkId) : null;

    const shared = {
      project: projectMeta?.project ?? null,
      projectMeta,
      paramEnvKey,
    };

    switch (command) {
      case 'init':
        await handleInit(networkId, shared);
        break;
      case 'o':
        await handleOracle(networkId, shared);
        break;
      case 'l':
        await handleList(networkId, shared);
        break;
      case 'lh':
        await handleListHolders(networkId, shared);
        break;
      case 'em':
        await toggleMinting(true, networkId, shared);
        break;
      case 'dm':
        await toggleMinting(false, networkId, shared);
        break;
      case 'balance':
        await handleBalance(networkId, shared);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exitCode = 1;
    }
  } catch (error) {
    console.error('Command failed:', error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  }
}

void main();
