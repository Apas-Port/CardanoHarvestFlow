import { NextRequest, NextResponse } from 'next/server';

export interface NFTStatus {
  projectId: string;
  tokenId: number;
  assetName: string;
  policyId: string;
  status: 'pending' | 'minted' | 'failed';
  txHash?: string;
  mintedAt?: string;
  owner?: string;
}

export interface ProjectStats {
  projectId: string;
  totalMinted: number;
  lastTokenId: number;
  nextTokenId: number;
  recentMints: NFTStatus[];
}

// Mock data for demonstration (in production, use a database)
const nftDatabase: NFTStatus[] = [];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const tokenId = searchParams.get('tokenId');
    const owner = searchParams.get('owner');

    // Get specific NFT status
    if (projectId && tokenId) {
      const nft = nftDatabase.find(
        n => n.projectId === projectId && n.tokenId === parseInt(tokenId)
      );
      
      if (!nft) {
        return NextResponse.json(
          { error: 'NFT not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(nft);
    }

    // Get NFTs by owner
    if (owner) {
      const ownerNfts = nftDatabase.filter(n => n.owner === owner);
      return NextResponse.json({
        owner,
        nfts: ownerNfts,
        count: ownerNfts.length
      });
    }

    // Get project statistics
    if (projectId) {
      const projectNfts = nftDatabase.filter(n => n.projectId === projectId);
      const mintedNfts = projectNfts.filter(n => n.status === 'minted');
      const lastTokenId = Math.max(...projectNfts.map(n => n.tokenId), 0);

      const stats: ProjectStats = {
        projectId,
        totalMinted: mintedNfts.length,
        lastTokenId,
        nextTokenId: lastTokenId + 1,
        recentMints: projectNfts.slice(-10) // Last 10 mints
      };

      return NextResponse.json(stats);
    }

    // Return all NFTs (paginated in production)
    return NextResponse.json({
      nfts: nftDatabase.slice(-100), // Last 100 NFTs
      total: nftDatabase.length
    });

  } catch (error) {
    console.error('Status query error:', error);
    return NextResponse.json(
      { error: 'Failed to get NFT status' },
      { status: 500 }
    );
  }
}

// Update NFT status (webhook endpoint for blockchain updates)
export async function POST(req: NextRequest) {
  try {
    const body: Partial<NFTStatus> = await req.json();
    
    if (!body.projectId || body.tokenId === undefined) {
      return NextResponse.json(
        { error: 'Project ID and token ID are required' },
        { status: 400 }
      );
    }

    // Find existing NFT or create new one
    const existingIndex = nftDatabase.findIndex(
      n => n.projectId === body.projectId && n.tokenId === body.tokenId
    );

    if (existingIndex >= 0) {
      // Update existing NFT
      nftDatabase[existingIndex] = {
        ...nftDatabase[existingIndex],
        ...body,
        mintedAt: body.status === 'minted' ? new Date().toISOString() : nftDatabase[existingIndex].mintedAt
      };
    } else {
      // Add new NFT
      nftDatabase.push({
        projectId: body.projectId,
        tokenId: body.tokenId!,
        assetName: body.assetName || '',
        policyId: body.policyId || '',
        status: body.status || 'pending',
        txHash: body.txHash,
        owner: body.owner,
        mintedAt: body.status === 'minted' ? new Date().toISOString() : undefined
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update NFT status' },
      { status: 500 }
    );
  }
}