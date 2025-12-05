import { NextRequest, NextResponse } from 'next/server';
import { BlockfrostProvider, MeshTxBuilder } from '@meshsdk/core';
import { mConStr0, stringToHex } from '@meshsdk/common';
import { getNetworkConfig } from '@/lib/network-config';
import { oracleDatum, mNftMintOrBurn } from '@/lib/nft-contracts/type';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface BuildTxRequest {
  projectId: string;
  oracleData: any;
  scripts: any;
  recipientAddress: string;
  userUtxos: any[];
  collateralUtxo: any;
  lovelacePrice: number;
  tokenId: number;
  collectionName: string;
  policyId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BuildTxRequest;

    console.log('[build-tx] Building transaction server-side to avoid CORS');
    console.log('[build-tx] Request data:', {
      projectId: body.projectId,
      tokenId: body.tokenId,
      collectionName: body.collectionName,
      policyId: body.policyId,
      lovelacePrice: body.lovelacePrice,
      recipientAddress: body.recipientAddress,
      userUtxosCount: body.userUtxos?.length,
      hasCollateral: !!body.collateralUtxo,
      hasOracleData: !!body.oracleData,
      hasScripts: !!body.scripts,
    });

    const {
      oracleData,
      scripts,
      recipientAddress,
      userUtxos,
      collateralUtxo,
      lovelacePrice,
      tokenId,
      collectionName,
      policyId,
    } = body;

    const config = getNetworkConfig(req);
    const networkId: 0 | 1 = config.isMainnet ? 1 : 0;

    // Validate scripts format
    console.log('[build-tx] Scripts data:', {
      hasOracleCbor: !!scripts.oracleCbor,
      oracleCborType: typeof scripts.oracleCbor,
      oracleCborLength: scripts.oracleCbor?.length,
      oracleCborStart: scripts.oracleCbor?.substring(0, 40),
      hasNftCbor: !!scripts.nftCbor,
      nftCborType: typeof scripts.nftCbor,
      nftCborLength: scripts.nftCbor?.length,
      nftCborStart: scripts.nftCbor?.substring(0, 40),
      oracleAddress: scripts.oracleAddress,
    });

    // Validate that scripts are hex strings
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(scripts.oracleCbor)) {
      throw new Error('Oracle CBOR is not a valid hex string');
    }
    if (!hexRegex.test(scripts.nftCbor)) {
      throw new Error('NFT CBOR is not a valid hex string');
    }
    console.log('[build-tx] Script validation passed');

    // Create Blockfrost provider (server-side, no CORS issues)
    const blockfrostProvider = new BlockfrostProvider(config.blockfrostApiKey, networkId);

    const tx = new MeshTxBuilder({
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
      evaluator: blockfrostProvider,
    });

    const tokenName = `${collectionName} (${tokenId})`;
    const tokenNameHex = stringToHex(tokenName);
    console.log('[build-tx] Token name:', tokenName, '| Hex:', tokenNameHex);

    // NOTE: Do NOT manually specify lovelace for oracle UTxO
    // MeshTxBuilder will automatically calculate and add the minimum required lovelace
    // const oracleLovelace = oracleData.oracleUtxo.output.amount.find(
    //   (asset: any) => asset.unit === 'lovelace'
    // )?.quantity || '1491260';
    // console.log('[build-tx] Oracle lovelace:', oracleLovelace);

    // Build updated oracle datum
    console.log('[build-tx] Building oracle datum...');
    const updatedOracleDatum = oracleDatum({
      count: Number(oracleData.nftIndex) + 1,
      lovelace_price: lovelacePrice,
      fee_address: oracleData.feeCollectorAddressObj,
      nft_mint_allowed: oracleData.nftMintAllowed,
      nft_trade_allowed: oracleData.nftTradeAllowed,
      expected_apr_numerator: Number(oracleData.expectedAprNumerator),
      expected_apr_denominator: Number(oracleData.expectedAprDenominator),
      maturation_time: BigInt(oracleData.maturationTime),
      max_mints: BigInt(oracleData.maxMints),
    });
    console.log('[build-tx] Oracle datum built successfully');

    // 1. Spend oracle UTxO and update it
    console.log('[build-tx] Step 1: Adding oracle UTxO input/output...');
    tx.spendingPlutusScriptV3()
      .txIn(
        oracleData.oracleUtxo.input.txHash,
        oracleData.oracleUtxo.input.outputIndex,
        oracleData.oracleUtxo.output.amount,
        oracleData.oracleUtxo.output.address,
      )
      .txInRedeemerValue(mConStr0([]))
      .txInScript(scripts.oracleCbor)
      .txInInlineDatumPresent()
      // Only specify the oracle NFT - MeshTxBuilder will auto-calculate minimum lovelace
      .txOut(scripts.oracleAddress, [
        { unit: oracleData.oracleNftPolicyId, quantity: '1' }
      ])
      .txOutInlineDatumValue(updatedOracleDatum, 'JSON');
    console.log('[build-tx] Step 1: Complete');

    // 2. Pay fee to treasury
    console.log('[build-tx] Step 2: Adding treasury payment...');
    console.log('[build-tx] Fee collector address obj:', oracleData.feeCollectorAddressObj);

    // Use treasury address directly from config
    const feeCollectorAddress = config.treasuryAddress;
    console.log('[build-tx] Using treasury address:', feeCollectorAddress);

    tx.txOut(feeCollectorAddress, [
      { unit: 'lovelace', quantity: lovelacePrice.toString() },
    ]);
    console.log('[build-tx] Step 2: Complete');

    // 3. Mint NFT
    console.log('[build-tx] Step 3: Adding mint operation...');
    const mintedAssetUnit = `${policyId}${tokenNameHex}`;
    tx.mintPlutusScriptV3()
      .mint('1', policyId, tokenNameHex)
      .mintingScript(scripts.nftCbor)
      .mintRedeemerValue(mNftMintOrBurn('RMint'));
    console.log('[build-tx] Step 3: Complete');

    // 4. Send NFT to user
    console.log('[build-tx] Step 4: Adding NFT output to user...');
    // Let MeshTxBuilder auto-calculate minimum lovelace for NFT output
    tx.txOut(recipientAddress, [
      { unit: mintedAssetUnit, quantity: '1' },
    ]);
    console.log('[build-tx] Step 4: Complete');

    // 5. Add metadata
    console.log('[build-tx] Step 5: Adding metadata...');
    // TEMPORARY: Skip metadata to isolate the ERR_INVALID_CHAR error
    console.log('[build-tx] Step 5: Skipping metadata temporarily for debugging');
    // CIP-25: Use hex-encoded asset name as key, not the decoded name
    // const metadata = {
    //   [policyId]: {
    //     [tokenNameHex]: {
    //       name: tokenName,
    //       image: "ipfs://QmRzicpReutwCkM6aotuKjErFCUD213DpwPq6ByuzMJaua",
    //       description: tokenName,
    //     },
    //   },
    // };
    // console.log('[build-tx] Metadata structure:', JSON.stringify(metadata, null, 2));
    // tx.metadataValue('721', metadata);
    console.log('[build-tx] Step 5: Complete');

    // 6. Set change address (IMPORTANT: Must be before selectUtxosFrom)
    console.log('[build-tx] Step 6: Setting change address...');
    tx.changeAddress(recipientAddress);
    console.log('[build-tx] Step 6: Complete');

    // 7. Let MeshTxBuilder auto-select UTxOs (IMPORTANT: Must be before txInCollateral)
    console.log('[build-tx] Step 7: Setting selectUtxosFrom...');
    tx.selectUtxosFrom(userUtxos);
    console.log('[build-tx] Step 7: Complete - MeshTxBuilder will auto-select required UTxOs');

    // 8. Add collateral (IMPORTANT: Must be AFTER selectUtxosFrom)
    console.log('[build-tx] Step 8: Adding collateral...');
    tx.txInCollateral(
      collateralUtxo.input.txHash,
      collateralUtxo.input.outputIndex,
      collateralUtxo.output.amount,
      collateralUtxo.output.address,
    );
    console.log('[build-tx] Step 8: Complete');

    console.log('[build-tx] Completing transaction...');

    // Try to build the transaction with more granular error handling
    let unsignedTx: string;
    try {
      console.log('[build-tx] Calling tx.complete()...');
      unsignedTx = await tx.complete();
      console.log('[build-tx] tx.complete() returned successfully');
      console.log('[build-tx] Unsigned tx type:', typeof unsignedTx);
      console.log('[build-tx] Unsigned tx length:', unsignedTx?.length);

      if (!unsignedTx || typeof unsignedTx !== 'string') {
        throw new Error(`Invalid transaction output: ${typeof unsignedTx}`);
      }

      return NextResponse.json({
        success: true,
        unsignedTx,
      });
    } catch (completeError: any) {
      console.error('[build-tx] ============ ERROR DETAILS ============');
      console.error('[build-tx] Raw error:', completeError);
      console.error('[build-tx] Error typeof:', typeof completeError);
      console.error('[build-tx] Error constructor:', completeError?.constructor?.name);
      console.error('[build-tx] Error instanceof Error:', completeError instanceof Error);

      // Try to extract error info in different ways
      if (typeof completeError === 'string') {
        console.error('[build-tx] Error is string:', completeError);
        try {
          const parsed = JSON.parse(completeError);
          console.error('[build-tx] Parsed error:', parsed);
        } catch (parseErr) {
          console.error('[build-tx] Could not parse error as JSON');
        }
      }

      console.error('[build-tx] Error properties:', Object.getOwnPropertyNames(completeError || {}));
      console.error('[build-tx] Error.stack:', completeError?.stack);
      console.error('[build-tx] Error.cause:', completeError?.cause);
      console.error('[build-tx] =====================================');

      throw new Error(`Transaction completion failed: ${String(completeError)}`);
    }

  } catch (error) {
    console.error('[build-tx] Error:', error);

    // Log the full error details
    if (error instanceof Error) {
      console.error('[build-tx] Error message:', error.message);
      console.error('[build-tx] Error stack:', error.stack);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to build transaction',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}
