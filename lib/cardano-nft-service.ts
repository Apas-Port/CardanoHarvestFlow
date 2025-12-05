import { getNetworkConfig } from './network-config';
import {
  Transaction,
  ForgeScript,
  AssetMetadata,
  BrowserWallet,
  resolveScriptHash
} from '@meshsdk/core';

// Utility function to truncate string to specific byte length
function truncateToBytes(str: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8');
  
  const encoded = encoder.encode(str);
  if (encoded.length <= maxBytes) {
    return str;
  }
  
  // Truncate to maxBytes
  let truncated = encoded.slice(0, maxBytes);
  
  // Ensure we don't cut in the middle of a UTF-8 character
  let i = truncated.length - 1;
  while (i >= 0 && (truncated[i] & 0x80) !== 0 && (truncated[i] & 0xC0) !== 0xC0) {
    i--;
  }
  
  if (i >= 0) {
    truncated = truncated.slice(0, i);
  }
  
  // Add ellipsis if there's room
  const ellipsis = encoder.encode('...');
  if (truncated.length + ellipsis.length <= maxBytes) {
    truncated = new Uint8Array([...truncated, ...ellipsis]);
  }
  
  return decoder.decode(truncated);
}

export interface NFTMetadata {
  collection: string;
  name: string;
  image: string;
  description?: string;
  projectId: string;
  tokenId: number;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export class CardanoNFTService {
  private wallet: BrowserWallet | null = null;
  private blockfrostApiKey: string;

  constructor() {
    // Use Blockfrost API key from environment
    this.blockfrostApiKey = process.env.BLOCKFROST_API_KEY || process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || '';
  }

  async connectWallet(walletName: string): Promise<void> {
    const wallet = await BrowserWallet.enable(walletName);
    this.wallet = wallet;
  }

  async mintNFT(
    projectId: string,
    metadata: NFTMetadata,
    unitPrice: number,
    recipientAddress?: string
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get wallet address if recipient not specified
      const walletAddress = recipientAddress || await this.wallet.getChangeAddress();
      
      // Create a unique asset name based on project and timestamp
      // Asset names must be hex encoded
      const assetNameString = `${projectId.slice(0, 8)}_${Date.now()}`;
      const assetName = Buffer.from(assetNameString).toString('hex');
      
      // Get network ID (0 = testnet, 1 = mainnet)
      // Create minting policy using the wallet address
      const forgingScript = ForgeScript.withOneSignature(walletAddress);
      // Note: resolveScriptHash should be called without version parameter
      const policyId = resolveScriptHash(forgingScript);
      
      // Create asset metadata following CIP-25 standard
      const assetMetadata: AssetMetadata = {
        [policyId]: {
          [assetNameString]: {
            name: metadata.name,
            image: metadata.image,
            description: truncateToBytes(metadata.description || '', 64),
            mediaType: 'image/png',
            files: [
              {
                name: metadata.name,
                mediaType: 'image/png',
                src: metadata.image
              }
            ],
            projectId: metadata.projectId,
            tokenId: metadata.tokenId.toString(),
            serialNumber: metadata.tokenId.toString(),
            collection: metadata.collection || 'Harvestflow',
            attributes: metadata.attributes || []
          }
        }
      };

      // Create transaction with proper type
      const tx = new Transaction({ initiator: this.wallet });
      
      // Calculate payment amount in lovelace (1 ADA = 1,000,000 lovelace)
      const paymentLovelace = Math.floor(unitPrice * 1_000_000);
      
      // Add payment to project treasury (you would replace this with actual project treasury address)
      const { treasuryAddress: configTreasuryAddress } = getNetworkConfig();
      const projectTreasuryAddress = configTreasuryAddress || walletAddress;
      
      console.log('Minting NFT with params:', {
        walletAddress,
        projectTreasuryAddress,
        paymentLovelace,
        policyId,
        assetName,
        assetNameString
      });
      
      // Define mint parameters
      const mintParams = {
        assetName: assetName,
        assetQuantity: '1',
        metadata: assetMetadata,
        label: '721' as `${number}`,
        recipient: walletAddress,
      };
      
      tx.mintAsset(
        forgingScript,
        mintParams,
      );
      
      // Send payment if not to self
      if (projectTreasuryAddress !== walletAddress && paymentLovelace > 0) {
        tx.sendLovelace(projectTreasuryAddress, paymentLovelace.toString());
      }
      
      // Build and sign transaction
      const unsignedTx = await tx.build();
      const signedTx = await this.wallet.signTx(unsignedTx);
      const txHash = await this.wallet.submitTx(signedTx);
      
      return txHash;
    } catch (error) {
      console.error('Error minting NFT:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  }

  async getWalletBalance(): Promise<number> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const lovelace = await this.wallet.getLovelace();
      return parseInt(lovelace) / 1_000_000; // Convert to ADA
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async estimateMintingFee(unitPrice: number): Promise<number> {
    // Estimate transaction fee (usually around 2-3 ADA for minting)
    const baseFee = 2.5;
    const totalCost = unitPrice + baseFee;
    return totalCost;
  }
}

export const cardanoNFTService = new CardanoNFTService();
