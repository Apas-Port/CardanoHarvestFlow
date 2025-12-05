import { NextRequest, NextResponse } from 'next/server';
import { getNetworkConfig } from '@/lib/network-config';
import { resolveScriptHash } from '@meshsdk/core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get('projectId') || '001';

    const { blockfrostApiKey, network, blockfrostUrl } = getNetworkConfig(req);

    if (!blockfrostApiKey) {
      return NextResponse.json({
        error: 'Blockfrost API key not configured',
        network,
      }, { status: 500 });
    }

    // Load contract to get oracle address
    const { loadContractForProject } = await import('@/lib/harvestflow-contract');
    const { contract } = await loadContractForProject(projectId, { requireWallet: false, source: req });

    const oracleAddress = contract.oracleAddress;

    // Fetch UTxOs directly from Blockfrost
    const url = `${blockfrostUrl}/addresses/${oracleAddress}/utxos`;
    console.log('[oracle-test] Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        'project_id': blockfrostApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: 'Blockfrost API error',
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        network,
      }, { status: 500 });
    }

    const utxos = await response.json();

    // Calculate expected oracle NFT policy ID
    const oracleNftPolicyId = resolveScriptHash(contract.getOracleNFTCbor(), "V3");

    // Extract assets from each UTxO and check for oracle NFT
    const utxoSummary = utxos.map((utxo: any, idx: number) => {
      const assets = utxo.amount.map((a: any) => {
        const unit = a.unit === 'lovelace' ? 'lovelace' : a.unit;
        const policyId = unit.length > 56 ? unit.slice(0, 56) : null;
        const tokenName = unit.length > 56 ? unit.slice(56) : null;
        const isOracleNFT = policyId === oracleNftPolicyId;
        
        return {
          unit: unit === 'lovelace' ? 'lovelace' : (unit.length > 60 ? `${unit.slice(0, 56)}...${unit.slice(-4)}` : unit),
          fullUnit: unit !== 'lovelace' ? unit : undefined,
          policyId: policyId || undefined,
          tokenName: tokenName || undefined,
          quantity: a.quantity,
          isOracleNFT,
        };
      });
      
      const hasOracleNFT = assets.some(a => a.isOracleNFT);
      
      return {
        index: idx,
        txHash: utxo.tx_hash,
        outputIndex: utxo.output_index,
        hasOracleNFT,
        amount: assets,
      };
    });

    const oracleUtxos = utxoSummary.filter(u => u.hasOracleNFT);
    const allPolicyIds = new Set<string>();
    const allAssets: Array<{ unit: string; policyId: string; tokenName: string }> = [];
    
    utxos.forEach((utxo: any) => {
      utxo.amount.forEach((a: any) => {
        if (a.unit !== 'lovelace') {
          // Oracle NFT has empty token name, so unit length is exactly 56 (policy ID only)
          if (a.unit.length === 56) {
            allPolicyIds.add(a.unit);
            allAssets.push({
              unit: a.unit,
              policyId: a.unit,
              tokenName: '', // Empty token name for oracle NFT
            });
          } else if (a.unit.length > 56) {
            const policyId = a.unit.slice(0, 56);
            const tokenName = a.unit.slice(56);
            allPolicyIds.add(policyId);
            allAssets.push({
              unit: a.unit,
              policyId,
              tokenName,
            });
          } else {
            // Asset unit is shorter than expected, log for debugging
            allAssets.push({
              unit: a.unit,
              policyId: a.unit,
              tokenName: '',
            });
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      projectId,
      network,
      oracleAddress,
      expectedOracleNftPolicyId: oracleNftPolicyId,
      totalUtxos: utxos.length,
      oracleUtxosFound: oracleUtxos.length,
      allPolicyIdsFound: Array.from(allPolicyIds).sort(),
      allAssetsFound: allAssets.slice(0, 20), // Limit to first 20 for readability
      totalAssetsFound: allAssets.length,
      policyIdMatch: Array.from(allPolicyIds).includes(oracleNftPolicyId),
      utxos: utxoSummary.slice(0, 10), // Limit to first 10 UTXOs for readability
      blockfrostUrl: url,
    });
  } catch (error) {
    console.error('[oracle-test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
