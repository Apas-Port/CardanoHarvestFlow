import { useState, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { cardanoNFTService, NFTMetadata } from '@/lib/cardano-nft-service';
import { Project } from '@/lib/project';

export interface MintStatus {
  status: 'idle' | 'preparing' | 'signing' | 'submitting' | 'success' | 'error';
  txHash?: string;
  error?: string;
  tokenId?: number;
}

export function useCardanoNFTMint() {
  const { connected, name: walletName } = useWallet();
  const [mintStatus, setMintStatus] = useState<MintStatus>({ status: 'idle' });
  const [isProcessing, setIsProcessing] = useState(false);

  const mintProjectNFT = useCallback(async (
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
      // Connect the service to the wallet
      await cardanoNFTService.connectWallet(walletName);

      // Check wallet balance
      const balance = await cardanoNFTService.getWalletBalance();
      const totalCost = await cardanoNFTService.estimateMintingFee(project.unitPrice * quantity);

      if (balance < totalCost) {
        throw new Error(`Insufficient balance. You need at least ${totalCost} ADA`);
      }

      const results = [];
      
      // Mint NFTs based on quantity
      for (let i = 0; i < quantity; i++) {
        setMintStatus({ 
          status: 'signing',
          tokenId: i + 1
        });

        // Generate token ID (in production, this should come from a backend)
        const tokenId = Date.now() + i;

        // Create metadata for the NFT
        const metadata: NFTMetadata = {
          collection: 'Harvestflow',
          name: `${project.title} #${tokenId}`,
          image: project.mainImage || '/images/default-nft.png',
          description: project.description,
          projectId: project.id,
          tokenId: tokenId,
          attributes: [
            {
              trait_type: 'Project',
              value: project.title
            },
            {
              trait_type: 'APY',
              value: project.apy
            },
            {
              trait_type: 'Lending Type',
              value: project.lendingType
            },
            {
              trait_type: 'Network',
              value: 'Cardano'
            },
            {
              trait_type: 'Unit Price',
              value: project.unitPrice
            }
          ]
        };

        setMintStatus({ 
          status: 'submitting',
          tokenId: i + 1
        });

        // Mint the NFT
        const txHash = await cardanoNFTService.mintNFT(
          project.id,
          metadata,
          project.unitPrice
        );

        results.push({ txHash, tokenId });
      }

      setMintStatus({ 
        status: 'success', 
        txHash: results[0].txHash,
        tokenId: results[0].tokenId
      });

      return results;
    } catch (error) {
      console.error('Minting error:', error);
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
    mintProjectNFT,
    mintStatus,
    isProcessing,
    resetMintStatus
  };
}