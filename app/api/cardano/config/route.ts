import { NextRequest, NextResponse } from 'next/server';
import { getServerNetworkConfig } from '@/lib/network-config';

export const dynamic = 'force-dynamic';

/**
 * BFF endpoint for network configuration
 *
 * Returns public network configuration without exposing sensitive API keys.
 * Clients should use this endpoint to get network settings instead of
 * accessing environment variables directly.
 */
export async function GET(request: NextRequest) {
  try {
    const config = getServerNetworkConfig(request);

    // Return only public information (no API keys)
    return NextResponse.json({
      network: config.network,
      isMainnet: config.isMainnet,
      isTestnet: config.isTestnet,
      treasuryAddress: config.treasuryAddress,
      policyId: config.policyId,
      explorerUrl: config.explorerUrl,
      blockfrostUrl: config.blockfrostUrl,
      koiosUrl: config.koiosUrl,
      // DO NOT include blockfrostApiKey
    });
  } catch (error) {
    console.error('[api/cardano/config] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get network config' },
      { status: 500 }
    );
  }
}
