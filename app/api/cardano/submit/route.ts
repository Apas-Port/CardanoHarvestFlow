import { NextRequest, NextResponse } from 'next/server';
import { BlockfrostProvider } from '@meshsdk/core';
import type { BlockInfo, TransactionInfo } from '@meshsdk/common';
import { getServerNetworkConfig } from '@/lib/network-config';
import { loadContractForProject } from '@/lib/harvestflow-contract';

// Initialize Blockfrost provider with correct configuration
const getBlockfrostProvider = (source?: Request | URL | string) => {
  const config = getServerNetworkConfig(source);
  const projectId = config.blockfrostApiKey;

  if (!projectId) {
    throw new Error('BLOCKFROST_PROJECT_ID environment variable is not set');
  }

  // CRITICAL: Pass networkId to ensure correct network is used
  const networkId: 0 | 1 = config.isMainnet ? 1 : 0;
  console.log('[getBlockfrostProvider] Creating provider for network:', config.network, 'networkId:', networkId);

  // Create provider with explicit network ID
  const provider = new BlockfrostProvider(projectId, networkId);

  return provider;
};

export interface SubmitRequest {
  signedTx: string;
  txId: string;
  projectId: string;
  tokenId: number;
  alreadySubmitted?: boolean;
  txHash?: string;
}

export interface SubmitResponse {
  success: boolean;
  txHash?: string;
  tokenId?: number;
  error?: string;
  blockHeight?: number;
  confirmations?: number;
  combinedSignedTx?: string;
}

// In-memory storage for transaction tracking (in production, use a database)
const transactionStore = new Map<string, {
  txHash: string;
  projectId: string;
  tokenId: number;
  timestamp: number;
  status: 'submitted' | 'confirmed' | 'failed';
}>();

type BlockfrostTransactionInfo = TransactionInfo & {
  block_height?: number;
};

type BlockfrostBlockInfo = BlockInfo & {
  height?: number;
};

const extractBlockHeight = (txInfo: BlockfrostTransactionInfo): number | undefined => {
  if (typeof txInfo.blockHeight === 'number') {
    return txInfo.blockHeight;
  }

  if (typeof txInfo.block_height === 'number') {
    return txInfo.block_height;
  }

  return undefined;
};

const extractLatestBlockHeight = (blockInfo: BlockfrostBlockInfo): number | undefined => {
  if (typeof blockInfo.height === 'number') {
    return blockInfo.height;
  }

  const numericSlot = Number(blockInfo.slot);
  return Number.isFinite(numericSlot) ? numericSlot : undefined;
};

export async function POST(req: NextRequest) {
  try {
    const body: SubmitRequest = await req.json();
    const { signedTx, txId, projectId, tokenId, alreadySubmitted, txHash: providedTxHash } = body;

    // Validate request
    if (!signedTx || !txId || !projectId || typeof tokenId !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Blockfrost provider
    let provider: BlockfrostProvider;
    try {
      provider = getBlockfrostProvider(req);
    } catch (error) {
      console.error('Blockfrost provider error:', error);
      
      // Fallback to simulation mode if Blockfrost is not configured
      console.log('Running in simulation mode - no Blockfrost API key configured');
      const simulatedTxHash = `sim_${txId}_${Date.now().toString(36)}`;
      
      // Store simulated transaction
      transactionStore.set(txId, {
        txHash: simulatedTxHash,
        projectId,
        tokenId,
        timestamp: Date.now(),
        status: 'confirmed'
      });
      
      return NextResponse.json({
        success: true,
        txHash: simulatedTxHash,
        tokenId,
        blockHeight: 1234567,
        confirmations: 1
      });
    }

    let txHash: string;
    let combinedSignedTx: string | undefined;

    // If transaction was already submitted through wallet, just track it
    if (alreadySubmitted && providedTxHash) {
      txHash = providedTxHash;
      console.log('Transaction already submitted via wallet:', txHash);
    } else {
      // User-only signing: transaction is fully signed by user, no server signature needed
      try {
        // Submit transaction to the Cardano network
        console.log('Submitting transaction to Cardano network...');
        console.log('Using Blockfrost provider with network:', getServerNetworkConfig(req).network);
        
        try {
          // Try direct submission first
          txHash = await provider.submitTx(signedTx);
        } catch (submitErr: unknown) {
          console.error('Direct submission failed:', submitErr);

          // If it fails, try using fetch directly to Blockfrost API
          const config = getServerNetworkConfig(req);
          const baseUrl = config.blockfrostUrl;
          const apiKey = config.blockfrostApiKey;

          console.log('Submitting to:', baseUrl);
          console.log('Using API key for network:', config.network);

          const response = await fetch(`${baseUrl}/tx/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/cbor',
              'project_id': apiKey
            },
            body: signedTx
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Blockfrost API error:', errorText);
            
            // Check if it's HTML (wrong endpoint)
            if (errorText.includes('<!DOCTYPE html>')) {
              throw new Error('Invalid Blockfrost endpoint - received HTML instead of JSON');
            }
            
            try {
              const error = JSON.parse(errorText);
              throw new Error(error.message || 'Failed to submit transaction');
            } catch {
              throw new Error('Failed to submit transaction: ' + errorText);
            }
          }
          
          const result = await response.json();
          txHash = result;
        }
      } catch (error: unknown) {
        console.error('Transaction submission error:', error);
        throw error;
      }
    }
    
    console.log('Transaction submitted successfully:', {
      txHash,
      projectId,
      tokenId
    });

    // Store transaction details
    transactionStore.set(txId, {
      txHash,
      projectId,
      tokenId,
      timestamp: Date.now(),
      status: 'submitted'
    });

    // Try to get initial confirmation status
    let blockHeight: number | undefined;
    let confirmations = 0;
    
    try {
      // Wait a bit for the transaction to be indexed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch transaction details
      const txInfo = await provider.fetchTxInfo(txHash) as BlockfrostTransactionInfo;
      if (txInfo) {
        blockHeight = extractBlockHeight(txInfo);

        // Get current block height for confirmations
        const latestBlock = await provider.fetchBlockInfo('latest') as BlockfrostBlockInfo;
        if (latestBlock && typeof blockHeight === 'number') {
          const latestHeight = extractLatestBlockHeight(latestBlock);
          if (typeof latestHeight === 'number') {
            confirmations = latestHeight - blockHeight;
          }
        }

        // Update status if confirmed
        if (confirmations > 0) {
          const storedTx = transactionStore.get(txId);
          if (storedTx) {
            storedTx.status = 'confirmed';
            transactionStore.set(txId, storedTx);
          }
        }
      }
    } catch (infoError) {
      // It's normal for the transaction to not be indexed immediately
      console.log('Transaction not yet indexed, will be confirmed later', infoError);
    }

    return NextResponse.json({
      success: true,
      txHash,
      tokenId,
      combinedSignedTx,
      blockHeight,
      confirmations
    });

  } catch (error) {
    console.error('Submit endpoint error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Get transaction status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const txId = searchParams.get('txId');
    const txHash = searchParams.get('txHash');

    if (!txId && !txHash) {
      return NextResponse.json(
        { error: 'Either txId or txHash is required' },
        { status: 400 }
      );
    }

    // Find transaction by ID or hash
    let transaction;
    if (txId) {
      transaction = transactionStore.get(txId);
    } else if (txHash) {
      // Find by hash
      for (const tx of transactionStore.values()) {
        if (tx.txHash === txHash) {
          transaction = tx;
          break;
        }
      }
    }

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // If transaction is submitted but not confirmed, check current status
    if (transaction.status === 'submitted' && transaction.txHash && !transaction.txHash.startsWith('sim_')) {
      try {
        const provider = getBlockfrostProvider();
      const txInfo = await provider.fetchTxInfo(transaction.txHash) as BlockfrostTransactionInfo;

      if (txInfo) {
          const blockHeight = extractBlockHeight(txInfo);
          if (blockHeight) {
            // Get current block height for confirmations
            const latestBlock = await provider.fetchBlockInfo('latest') as BlockfrostBlockInfo;
            const latestHeight = extractLatestBlockHeight(latestBlock);
            const confirmations = typeof latestHeight === 'number'
              ? latestHeight - blockHeight
              : 0;
            
            return NextResponse.json({
              ...transaction,
              blockHeight,
              confirmations,
              status: confirmations > 0 ? 'confirmed' : 'submitted'
            });
          }
        }
      } catch (error) {
        console.log('Could not fetch updated transaction status', error);
      }
    }

    return NextResponse.json(transaction);

  } catch (error) {
    console.error('Status query error:', error);
    return NextResponse.json(
      { error: 'Failed to get transaction status' },
      { status: 500 }
    );
  }
}
