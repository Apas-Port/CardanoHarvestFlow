import { NextRequest, NextResponse } from 'next/server';

import { setHighestTokenId, getAllTokenIds } from '@/lib/tokenIdManager';
import { matchNFTPolicyIdWithProjects, type Project } from '@/lib/project';
import { resolveMintMetadataForToken, getMintMetadataFilePath } from '@/lib/mint-metadata';

// Initialize token IDs from known NFTs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { knownNFTs } = body;

    if (!Array.isArray(knownNFTs)) {
      return NextResponse.json(
        { error: 'knownNFTs must be an array' },
        { status: 400 }
      );
    }

    // Process each NFT to find the highest token ID per policy
    const tokenIdsByPolicy = new Map<string, number>();
    
    knownNFTs.forEach((nftCandidate) => {
      if (!nftCandidate || typeof nftCandidate !== 'object') {
        return;
      }

      const nft = nftCandidate as {
        policyId?: unknown;
        tokenId?: unknown;
        serialNumber?: unknown;
      };

      const policyId = typeof nft.policyId === 'string' ? nft.policyId : undefined;
      const tokenIdRaw = typeof nft.tokenId === 'string'
        ? nft.tokenId
        : typeof nft.serialNumber === 'string'
          ? nft.serialNumber
          : undefined;

      if (policyId && tokenIdRaw) {
        const tokenId = parseInt(tokenIdRaw || '0', 10);
        if (!isNaN(tokenId) && tokenId > 0) {
          const current = tokenIdsByPolicy.get(policyId) || 0;
          tokenIdsByPolicy.set(policyId, Math.max(current, tokenId));
        }
      }
    });

    // Update the manager with all found token IDs
    let updatedCount = 0;
    for (const [policyId, highestTokenId] of tokenIdsByPolicy.entries()) {
      setHighestTokenId(policyId, highestTokenId);
      updatedCount++;
      console.log('Initialized token ID for policy:', policyId, 'highest:', highestTokenId);
    }

    interface MetadataEntry {
      policyId: string;
      tokenId: string;
      projectId?: string;
      metadata: Record<string, unknown>;
      metadataSources: string[];
    }

    const metadataSourcePath = await getMintMetadataFilePath();
    let resolvedMetadata: MetadataEntry[] = [];

    if (metadataSourcePath) {
      const projectCache = new Map<string, Project | null>();

      const metadataResults = await Promise.all(
        knownNFTs.map(async (nftCandidate) => {
          if (!nftCandidate || typeof nftCandidate !== 'object') {
            return null;
          }

          const nft = nftCandidate as {
            policyId?: unknown;
            tokenId?: unknown;
            serialNumber?: unknown;
          };

          const policyId = typeof nft.policyId === 'string' ? nft.policyId : undefined;
          const tokenIdRaw = typeof nft.tokenId === 'string'
            ? nft.tokenId
            : typeof nft.serialNumber === 'string'
              ? nft.serialNumber
              : undefined;

          if (!policyId || !tokenIdRaw) {
            return null;
          }

          const tokenId = Number.parseInt(tokenIdRaw, 10);
          if (!Number.isFinite(tokenId) || tokenId <= 0) {
            return null;
          }

          const cacheKey = policyId.toLowerCase();
          let project = projectCache.get(cacheKey) ?? null;
          if (project === undefined) {
            try {
              project = await matchNFTPolicyIdWithProjects(policyId, req);
            } catch (error) {
              console.error('[cardano/init] Failed to resolve project for policy', policyId, error);
              project = null;
            }
            projectCache.set(cacheKey, project);
          }

          const collectionName = project?.collectionName ?? project?.title ?? 'Harvestflow Collection';
          const assetName = `${collectionName} (${tokenId})`;

          const resolution = await resolveMintMetadataForToken({
            projectId: project?.id,
            policyId,
            tokenId,
            collectionName,
            assetName,
          });

          if (!resolution) {
            return null;
          }

          return {
            policyId,
            tokenId: tokenIdRaw,
            projectId: project?.id,
            metadata: resolution.metadata,
            metadataSources: resolution.appliedSources,
          } as MetadataEntry;
        }),
      );

      resolvedMetadata = metadataResults.filter((entry): entry is MetadataEntry => Boolean(entry));
    }

    const responseBody: Record<string, unknown> = {
      success: true,
      message: `Initialized ${updatedCount} policy token IDs`,
      tokenIds: Object.fromEntries(getAllTokenIds()),
    };

    if (resolvedMetadata.length > 0) {
      responseBody.metadata = resolvedMetadata;
    }
    if (metadataSourcePath) {
      responseBody.metadataSourcePath = metadataSourcePath;
    }

    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize token IDs' },
      { status: 500 }
    );
  }
}

// Get current token ID state
export async function GET() {
  try {
    return NextResponse.json({
      tokenIds: Object.fromEntries(getAllTokenIds())
    });
  } catch (error) {
    console.error('Get init state error:', error);
    return NextResponse.json(
      { error: 'Failed to get token ID state' },
      { status: 500 }
    );
  }
}
