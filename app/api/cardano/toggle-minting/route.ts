import { NextRequest, NextResponse } from 'next/server';
import { getServerNetworkConfig } from '@/lib/network-config';

export interface ToggleMintingRequest {
  projectId: string;
  enabled: boolean;
  adminSignature?: string; // Optional: for additional security
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadContracts() {
  const [harvestflow, nftContracts] = await Promise.all([
    import('@/lib/harvestflow-contract'),
    import('@/lib/nft-contracts/offchain')
  ]);
  return { harvestflow, nftContracts };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ToggleMintingRequest;
    const { projectId, enabled } = body;

    console.log('[api/cardano/toggle-minting] Request received:', { projectId, enabled });

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean value' }, { status: 400 });
    }

    // Load the contract with server wallet (requireWallet: true)
    // This requires the server to have access to the admin wallet
    const { harvestflow } = await loadContracts();
    const { loadContractForProject } = harvestflow;
    
    try {
      const { contract, project } = await loadContractForProject(projectId, { 
        requireWallet: true, // This requires server wallet configuration
        source: req 
      });

      // Build the transaction to toggle minting
      console.log(`[api/cardano/toggle-minting] ${enabled ? 'Enabling' : 'Disabling'} minting for project: ${projectId}`);
      
      const txHex = await contract.setNFTMinting(enabled);
      
      console.log('[api/cardano/toggle-minting] Transaction built successfully:', txHex);

      return NextResponse.json({
        success: true,
        message: `NFT minting ${enabled ? 'enabled' : 'disabled'} successfully`,
        txHash: txHex,
        projectId,
        mintingEnabled: enabled
      });

    } catch (contractError) {
      console.error('[api/cardano/toggle-minting] Contract error:', contractError);
      
      // If the server doesn't have wallet access, provide instructions
      if (contractError instanceof Error && contractError.message.includes('wallet')) {
        return NextResponse.json({
          error: 'Server wallet not configured',
          details: 'To toggle minting, you need to configure the server with the admin wallet that controls the fee_address',
          instructions: {
            1: 'Set up the admin wallet credentials in environment variables',
            2: 'Or use a client-side approach with the admin wallet connected in the browser',
            3: 'Or manually run the toggle minting script with the admin wallet'
          }
        }, { status: 500 });
      }
      
      throw contractError;
    }

  } catch (error) {
    console.error('[api/cardano/toggle-minting] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to toggle minting';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint to check current minting status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const { harvestflow } = await loadContracts();
    const { loadContractForProject } = harvestflow;
    
    const { contract } = await loadContractForProject(projectId, { 
      requireWallet: false,
      source: req 
    });

    const oracleData = await contract.getOracleData();
    
    // Check if minting is allowed (handle different Bool formats)
    let mintingAllowed = false;
    if (typeof oracleData.nftMintAllowed === 'boolean') {
      mintingAllowed = oracleData.nftMintAllowed;
    } else if (oracleData.nftMintAllowed && typeof oracleData.nftMintAllowed === 'object') {
      mintingAllowed = (oracleData.nftMintAllowed as any).bool === true;
    }

    return NextResponse.json({
      projectId,
      mintingEnabled: mintingAllowed,
      currentIndex: Number(oracleData.nftIndex),
      maxMints: Number(oracleData.maxMints),
      feeCollectorAddress: oracleData.feeCollectorAddress
    });

  } catch (error) {
    console.error('[api/cardano/toggle-minting] GET error:', error);
    return NextResponse.json({ error: 'Failed to get minting status' }, { status: 500 });
  }
}