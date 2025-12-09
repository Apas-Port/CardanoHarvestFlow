import { NextRequest, NextResponse } from 'next/server';

import type { MintMetadataInput } from '@/lib/harvestflow-contract';
import { getProjectById, matchNFTPolicyIdWithProjects, Project } from '@/lib/project';
import { getServerNetworkConfig } from '@/lib/network-config';

export interface MintRequest {
  projectId: string;
  quantity?: number;
  recipientAddress?: string;
  unitPrice?: number;
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
      console.error('[api/cardano/mint] Failed to fetch projects:', response.status, response.statusText);
      return [];
    }
    const projects = await response.json();
    return Array.isArray(projects) ? (projects as Project[]) : [];
  } catch (error) {
    console.error('[api/cardano/mint] Unexpected error fetching projects:', error);
    return [];
  }
}

function selectProjectById(projects: Project[], projectId: string): Project | null {
  const normalized = projectId.toLowerCase();
  return projects.find((project) => project.id?.toLowerCase() === normalized) ?? null;
}

function selectProjectByPolicy(projects: Project[], policyId: string): Project | null {
  const normalized = policyId.toLowerCase();
  return (
    projects.find((project) => project.policyId?.toLowerCase() === normalized)
    ?? projects.find((project) =>
      Array.isArray(project.legacyPolicyIds) && project.legacyPolicyIds.some((legacy) => legacy?.toLowerCase() === normalized),
    )
    ?? null
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MintRequest;
    const projectId = body.projectId?.trim();

    console.log('[api/cardano/mint] POST request received for project:', projectId);

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (body.quantity !== undefined && body.quantity !== 1) {
      return NextResponse.json({ error: 'Only single NFT minting is supported per request' }, { status: 400 });
    }

    // Load contract WITHOUT server wallet (requireWallet: false)
    console.log('[api/cardano/mint] Loading contract for project:', projectId);
    const { loadContractForProject } = await loadHarvestflowContract();
    const { contract, project } = await loadContractForProject(projectId, { requireWallet: false, source: req });

    // Get oracle data (no wallet needed)
    console.log('[api/cardano/mint] Fetching oracle data...');
    console.log('[api/cardano/mint] Oracle address:', contract.oracleAddress);

    let oracleData;
    try {
      oracleData = await contract.getOracleData();
      console.log('[api/cardano/mint] Oracle data fetched successfully');
      console.log('[api/cardano/mint] Oracle UTxO:', oracleData.oracleUtxo ? 'Found' : 'NOT FOUND');
    } catch (error) {
      console.error('[api/cardano/mint] Error fetching oracle data:', error);
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
      console.error('[api/cardano/mint] Oracle UTxO not found!');
      console.error('[api/cardano/mint] Oracle address:', contract.oracleAddress);
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

    // Development override for minting check
    const isDev = process.env.NODE_ENV === 'development';
    const hasOverride = process.env.OVERRIDE_MINT_CHECK === 'true' || 
                       process.env[`DEV_MINT_OVERRIDE_${projectId.toUpperCase().replace(/-/g, '_')}`] === 'true';
    
    if (isDev && hasOverride) {
      console.log('[api/cardano/mint] DEV MODE: Overriding mint check for project:', projectId);
      // Override the nftMintAllowed flag in development
      if (oracleData.nftMintAllowed && typeof oracleData.nftMintAllowed === 'object') {
        (oracleData.nftMintAllowed as any).bool = true;
      }
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

    // Load metadata from project configuration
    const collectionName = project.collectionName ?? project.title;
    const tokenName = `${collectionName} #${currentIndex}`;
    
    // Validate that metadata.image (IPFS URL) is set in projects.json
    if (!project.metadata?.image) {
      return NextResponse.json({
        error: `Project ${project.id} must have metadata.image (IPFS URL) set in projects.json`
      }, { status: 400 });
    }

    if (!project.metadata.image.startsWith('ipfs://')) {
      return NextResponse.json({
        error: `Project ${project.id} metadata.image must be an IPFS URL (ipfs://...)`
      }, { status: 400 });
    }
    
    // Helper function to extract CID from IPFS URL for Cardano metadata (64 byte limit)
    const extractIpfsCid = (ipfsUrl: string): string => {
      if (!ipfsUrl) return ipfsUrl;
      // Remove ipfs:// prefix to save bytes (CID only fits in 64 byte limit)
      if (ipfsUrl.startsWith('ipfs://')) {
        return ipfsUrl.replace('ipfs://', '');
      }
      return ipfsUrl;
    };
    
    // Use metadata from projects.json
    const tokenMetadata = {
      name: tokenName,
      image: extractIpfsCid(project.metadata.image), // Extract CID only (removes ipfs:// prefix)
      description: project.metadata.description || project.description || tokenName,
      ...(project.metadata.mediaType && { mediaType: project.metadata.mediaType }),
      ...(project.metadata.attributes && { attributes: project.metadata.attributes }),
    };

    // Return data needed for client-side transaction building
    return NextResponse.json({
      success: true,
      projectId: project.id,
      policyId: oracleData.policyId,
      tokenId: currentIndex,
      lovelacePrice: oracleData.lovelacePrice,
      maxMints,
      mintedCount: currentIndex,
      collectionName: project.collectionName ?? project.title,
      feeCollectorAddress: oracleData.feeCollectorAddress,
      tokenMetadata,
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
    console.error('[api/cardano/mint] Error fetching mint data:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch mint data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const projectIdParam = searchParams.get('projectId') ?? undefined;
    const policyIdParam = searchParams.get('policyId') ?? undefined;

    if (!projectIdParam && !policyIdParam) {
      return NextResponse.json({ error: 'Project ID or Policy ID is required' }, { status: 400 });
    }

    const projects = await fetchProjects(req);

    let project: Project | null = null;
    if (projectIdParam) {
      project = selectProjectById(projects, projectIdParam);
    }
    if (!project && policyIdParam) {
      project = selectProjectByPolicy(projects, policyIdParam);
    }
    if (!project) {
      // Fallback to existing project loader (may rely on cached fetch logic)
      if (projectIdParam) {
        project = await getProjectById(projectIdParam, req);
      } else if (policyIdParam) {
        const matched = await matchNFTPolicyIdWithProjects(policyIdParam, req);
        project = matched ?? null;
      }
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { getOracleSnapshot, boolDataToBoolean } = await loadHarvestflowContract();
    let snapshot;
    try {
      snapshot = await getOracleSnapshot(project.id, req);
    } catch (snapshotError) {
      console.error('[api/cardano/mint] Error getting oracle snapshot:', snapshotError);
      const errorMessage = snapshotError instanceof Error ? snapshotError.message : String(snapshotError);
      
      // Check if it's an oracle UTxO not found error
      if (errorMessage.includes('Cannot read properties of undefined') || 
          errorMessage.includes('oracleUtxo') ||
          errorMessage.includes('getAddressUtxosWithToken')) {
        return NextResponse.json({
          error: 'Oracle UTxO not found. The oracle might not be initialized for this project.',
          details: {
            projectId: project.id,
            error: errorMessage,
          }
        }, { status: 500 });
      }
      
      return NextResponse.json({
        error: `Failed to get oracle snapshot: ${errorMessage}`,
        details: {
          projectId: project.id,
        }
      }, { status: 500 });
    }
    
    const currentIndex = Number(snapshot.oracle.nftIndex ?? 0);
    const maxMints = Number((snapshot.oracle.maxMints && 'int' in snapshot.oracle.maxMints) ? snapshot.oracle.maxMints.int : snapshot.oracle.maxMints ?? 0);
    const lovelacePrice = Number(snapshot.oracle.lovelacePrice ?? 0);

    // Debug: Log the actual structure of nftMintAllowed
    console.log('[api/cardano/mint] GET - nftMintAllowed structure:', JSON.stringify(snapshot.oracle.nftMintAllowed, null, 2));
    console.log('[api/cardano/mint] GET - nftMintAllowed type:', typeof snapshot.oracle.nftMintAllowed);
    console.log('[api/cardano/mint] GET - boolDataToBoolean result:', boolDataToBoolean(snapshot.oracle.nftMintAllowed));

    return NextResponse.json({
      projectId: project.id,
      policyId: snapshot.oracle.policyId,
      currentTokenId: currentIndex,
      nextTokenId: currentIndex + 1,
      maxMints,
      lovelacePrice,
      mintingAllowed: boolDataToBoolean(snapshot.oracle.nftMintAllowed),
      collectionName: snapshot.collectionName,
    });
  } catch (error) {
    console.error('[api/cardano/mint] Status query error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Failed to get minting status',
      details: {
        error: errorMessage,
      }
    }, { status: 500 });
  }
}
