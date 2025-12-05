import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig } from '@/lib/network-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const config = getNetworkConfig(req);

    // Check which environment variables are set (don't expose actual values)
    const envCheck = {
      hasBlockfrostApiKey: !!config.blockfrostApiKey,
      blockfrostApiKeyLength: config.blockfrostApiKey?.length || 0,
      network: config.network,
      isMainnet: config.isMainnet,
      hasParamUtxoRumduol: !!process.env.PARAM_UTXO_RUMDUOL,
      paramUtxoRumduolFormat: process.env.PARAM_UTXO_RUMDUOL
        ? 'JSON object set'
        : 'NOT SET',
    };

    return NextResponse.json({
      success: true,
      config: envCheck,
      message: 'Configuration check completed'
    });
  } catch (error) {
    console.error('[config-test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
