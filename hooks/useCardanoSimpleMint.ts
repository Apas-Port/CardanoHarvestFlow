import { useState, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { BrowserWallet } from '@meshsdk/core';
import { simpleCardanoMint } from '@/lib/cardano-simple-mint';
import { Project } from '@/lib/project';

export interface SimpleMintStatus {
  status: 'idle' | 'preparing' | 'signing' | 'submitting' | 'success' | 'error';
  txHash?: string;
  error?: string;
}

export function useCardanoSimpleMint() {
  const { connected, name: walletName } = useWallet();
  const [mintStatus, setMintStatus] = useState<SimpleMintStatus>({ status: 'idle' });
  const [isProcessing, setIsProcessing] = useState(false);

  const mintNFT = useCallback(async (
    project: Project,
    quantity: number = 1
  ) => {
    if (!connected || !walletName) {
      setMintStatus({ 
        status: 'error', 
        error: 'Please connect your wallet first' 
      });
      return;
    }

    setIsProcessing(true);
    setMintStatus({ status: 'preparing' });

    try {
      // Enable the wallet
      const browserWallet = await BrowserWallet.enable(walletName);
      
      // For simplicity, mint one at a time for now
      const results = [];
      
      for (let i = 0; i < quantity; i++) {
        setMintStatus({ 
          status: 'signing'
        });

        const metadata = {
          name: `${project.title} #${Date.now() + i}`,
          image: project.mainImage || '/images/default-nft.png',
          description: project.description
        };

        const txHash = await simpleCardanoMint(
          browserWallet,
          project.id,
          metadata,
          project.unitPrice
        );

        results.push(txHash);
      }

      setMintStatus({ 
        status: 'success', 
        txHash: results[0]
      });

      return results[0];
    } catch (error) {
      console.error('Simple minting error:', error);
      setMintStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to mint NFT' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [connected, walletName]);

  const resetMintStatus = useCallback(() => {
    setMintStatus({ status: 'idle' });
  }, []);

  return {
    mintNFT,
    mintStatus,
    isProcessing,
    resetMintStatus
  };
}