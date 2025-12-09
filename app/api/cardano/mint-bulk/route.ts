import { NextRequest, NextResponse } from 'next/server';

import type { MintMetadataInput } from '@/lib/harvestflow-contract';
import { boolDataToBoolean } from '@/lib/harvestflow-contract';
import { getProjectById, matchNFTPolicyIdWithProjects, Project } from '@/lib/project';
import { getServerNetworkConfig } from '@/lib/network-config';

export interface BulkMintRequest {
  projectId: string;
  quantity: number;
  metadataList?: MintMetadataInput[];
  recipientAddress?: string;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadHarvestflowContract() {
  return import('@/lib/harvestflow-contract');
}

function resolveProjectResourcePath(source?: Request | URL | string): string {
  const { isMainnet } = getServerNetworkConfig(source);
  return isMainnet ? '/data/projects.json' : '/data/dev-projects.json';
}

async function fetchProjects(request: NextRequest): Promise<Project[]> {
  const resourcePath = resolveProjectResourcePath(request);
  try {
    const dataUrl = new URL(resourcePath, request.url);
    const response = await fetch(dataUrl, { cache: 'no-store' });
    if (!response.ok) {
      console.error('[api/cardano/mint-bulk] Failed to fetch projects:', response.status, response.statusText);
      return [];
    }
    const projects = await response.json();
    return Array.isArray(projects) ? (projects as Project[]) : [];
  } catch (error) {
    console.error('[api/cardano/mint-bulk] Unexpected error fetching projects:', error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BulkMintRequest;
    const projectId = body.projectId?.trim();
    const quantity = body.quantity;

    console.log('[api/cardano/mint-bulk] POST request received for project:', projectId, 'quantity:', quantity);

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!quantity || quantity < 1 || quantity > 15) {
      return NextResponse.json({ error: 'quantity must be between 1 and 15' }, { status: 400 });
    }

    // Load contract WITHOUT server wallet (requireWallet: false)
    console.log('[api/cardano/mint-bulk] Loading contract for project:', projectId);
    const { loadContractForProject } = await loadHarvestflowContract();
    const { contract, project } = await loadContractForProject(projectId, { requireWallet: false, source: req });

    // Get oracle data (no wallet needed)
    console.log('[api/cardano/mint-bulk] Fetching oracle data...');
    console.log('[api/cardano/mint-bulk] Oracle address:', contract.oracleAddress);

    let oracleData;
    try {
      oracleData = await contract.getOracleData();
      console.log('[api/cardano/mint-bulk] Oracle data fetched successfully');
      console.log('[api/cardano/mint-bulk] Oracle UTxO:', oracleData.oracleUtxo ? 'Found' : 'NOT FOUND');
    } catch (error) {
      console.error('[api/cardano/mint-bulk] Error fetching oracle data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Get network config for debugging
      const { blockfrostApiKey, network } = getServerNetworkConfig(req);

      return NextResponse.json({
        error: `Failed to fetch oracle data: ${errorMessage}`,
        details: {
          projectId,
          oracleAddress: contract.oracleAddress,
          network,
          hasBlockfrostKey: !!blockfrostApiKey,
          blockfrostKeyLength: blockfrostApiKey?.length || 0,
        }
      }, { status: 500 });
    }

    if (!oracleData || !oracleData.oracleUtxo) {
      console.error('[api/cardano/mint-bulk] Oracle UTxO not found!');
      console.error('[api/cardano/mint-bulk] Oracle address:', contract.oracleAddress);
      return NextResponse.json({
        error: 'Oracle UTxO not found. The oracle might not be initialized for this project.',
        details: {
          projectId,
          oracleAddress: contract.oracleAddress,
          hasOracleData: !!oracleData,
        }
      }, { status: 500 });
    }

    // Get script CBORs
    const nftCbor = contract.getNFTCbor();
    const oracleCbor = contract.getOracleCbor();
    const oracleAddress = contract.oracleAddress;

    const currentIndex = typeof oracleData.nftIndex === 'object' && 
      'int' in oracleData.nftIndex 
      ? Number((oracleData.nftIndex as any).int)
      : Number(oracleData.nftIndex);

    const maxMints = typeof oracleData.maxMints === 'object' && 'int' in oracleData.maxMints
      ? Number(oracleData.maxMints.int)
      : Number(oracleData.maxMints);

    // Check if bulk mint would exceed max mints
    if (currentIndex + quantity > maxMints) {
      return NextResponse.json({
        error: `Bulk mint would exceed max mints. Current: ${currentIndex}, Requested: ${quantity}, Max: ${maxMints}`
      }, { status: 400 });
    }

    // Check if minting is allowed using boolDataToBoolean (handles all Bool formats)
    let mintingAllowed = boolDataToBoolean(oracleData.nftMintAllowed);
    
    // Development override for minting check
    const isDev = process.env.NODE_ENV === 'development';
    const hasOverride = process.env.OVERRIDE_MINT_CHECK === 'true' || 
                       process.env[`DEV_MINT_OVERRIDE_${projectId.toUpperCase().replace(/-/g, '_')}`] === 'true';
    
    if (isDev && hasOverride) {
      console.log('[api/cardano/mint-bulk] DEV MODE: Overriding mint check for project:', projectId);
      mintingAllowed = true;
    }
    
    if (!mintingAllowed) {
      return NextResponse.json({
        error: 'NFT minting is currently disabled for this project'
      }, { status: 400 });
    }

    // Helper to safely extract numeric value for JSON serialization
    const serializeNumericValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'bigint') return Number(value);
      if (value && typeof value === 'object' && 'int' in value) {
        return typeof value.int === 'bigint' ? Number(value.int) : Number(value.int);
      }
      return Number(value);
    };

    // Calculate token IDs for bulk mint
    const tokenIds = Array.from({ length: quantity }, (_, i) => currentIndex + i);
    const totalLovelace = Number(oracleData.lovelacePrice) * quantity;

    // Return data needed for client-side transaction building
    return NextResponse.json({
      success: true,
      projectId: project.id,
      policyId: oracleData.policyId,
      tokenIds,
      totalLovelace,
      lovelacePrice: oracleData.lovelacePrice,
      maxMints,
      mintedCount: currentIndex,
      collectionName: project.collectionName ?? project.title,
      feeCollectorAddress: oracleData.feeCollectorAddress,
      // Data for client-side transaction building
      oracleData: {
        nftIndex: currentIndex,
        oracleUtxo: oracleData.oracleUtxo,
        oracleNftPolicyId: oracleData.oracleNftPolicyId,
        // Extract lovelace amount from current Oracle UTxO for preservation
        oracleLovelace: (() => {
          const lovelaceAsset = oracleData.oracleUtxo.output.amount.find(
            (asset: { unit: string; quantity: string }) => asset.unit === 'lovelace'
          );
          return lovelaceAsset ? lovelaceAsset.quantity : '2000000'; // Default 2 ADA if not found
        })(),
        feeCollectorAddressObj: oracleData.feeCollectorAddressObj,
        nftMintAllowed: oracleData.nftMintAllowed,
        nftTradeAllowed: oracleData.nftTradeAllowed,
        expectedAprNumerator: serializeNumericValue(oracleData.expectedAprNumerator),
        expectedAprDenominator: serializeNumericValue(oracleData.expectedAprDenominator),
        maturationTime: serializeNumericValue(oracleData.maturationTime),
        maxMints: Number(maxMints),
      },
      scripts: {
        nftCbor,
        oracleCbor,
        oracleAddress,
      },
    });
  } catch (error) {
    console.error('[api/cardano/mint-bulk] Error fetching bulk mint data:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch bulk mint data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const projectIdParam = searchParams.get('projectId') ?? undefined;

    if (!projectIdParam) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { loadContractForProject } = await loadHarvestflowContract();
    const { contract, project } = await loadContractForProject(projectIdParam, { requireWallet: false, source: req });
    
    let oracleData;
    try {
      oracleData = await contract.getOracleData();
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch oracle data' }, { status: 500 });
    }

    const currentIndex = typeof oracleData.nftIndex === 'object' && 
      'int' in oracleData.nftIndex 
      ? Number((oracleData.nftIndex as any).int)
      : Number(oracleData.nftIndex);

    const maxMints = typeof oracleData.maxMints === 'object' && 'int' in oracleData.maxMints
      ? Number(oracleData.maxMints.int)
      : Number(oracleData.maxMints);

    // Check if minting is allowed using boolDataToBoolean (handles all Bool formats)
    const mintingAllowedStatus = boolDataToBoolean(oracleData.nftMintAllowed);

    const maxBulkQuantity = Math.min(50, maxMints - currentIndex);

    return NextResponse.json({
      projectId: project.id,
      policyId: oracleData.policyId,
      currentIndex,
      maxMints,
      remainingMints: maxMints - currentIndex,
      maxBulkQuantity,
      mintingAllowed: mintingAllowedStatus,
      lovelacePrice: oracleData.lovelacePrice,
      bulkMintSupported: true,
    });
  } catch (error) {
    console.error('[api/cardano/mint-bulk] Status query error:', error);
    return NextResponse.json({ error: 'Failed to get bulk minting status' }, { status: 500 });
  }
}