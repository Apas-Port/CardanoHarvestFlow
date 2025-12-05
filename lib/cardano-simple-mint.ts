import { Transaction, BrowserWallet, ForgeScript, resolveScriptHash, Mint } from '@meshsdk/core';
import { getNetworkConfig } from './network-config';

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

export async function simpleCardanoMint(
  wallet: BrowserWallet,
  projectId: string,
  metadata: {
    name: string;
    image: string;
    description?: string;
  },
  unitPrice: number
): Promise<string> {
  try {
    // Get wallet address
    const walletAddress = await wallet.getChangeAddress();
    
    // Create a simple asset name
    const assetNameString = `NFT${Date.now()}`;
    const assetName = Buffer.from(assetNameString).toString('hex');
    
    // Create minting policy using the wallet address
    const forgingScript = ForgeScript.withOneSignature(walletAddress);
    // Note: resolveScriptHash should be called without version parameter
    const policyId = resolveScriptHash(forgingScript);
    
    console.log('Simple mint params:', {
      walletAddress,
      assetName,
      assetNameString,
      policyId,
      unitPrice
    });
    
    // Create transaction
    const tx = new Transaction({ initiator: wallet });
    
    // Define mint amount
    const mintAmount: Mint = {
      assetName: assetName,
      assetQuantity: '1',
      metadata: {
        name: metadata.name,
        image: metadata.image,
        mediaType: 'image/png',
        description: truncateToBytes(metadata.description || '', 64),
        project: projectId
      },
      label: '721',
      recipient: walletAddress
    };
    
    // Mint the asset
    tx.mintAsset(forgingScript, mintAmount);
    
    // If there's a unit price, add a payment output
    if (unitPrice > 0) {
      const paymentLovelace = Math.floor(unitPrice * 1_000_000);
      const { treasuryAddress: configTreasuryAddress } = getNetworkConfig();
      const treasuryAddress = configTreasuryAddress || walletAddress;
      
      if (treasuryAddress !== walletAddress) {
        tx.sendLovelace(treasuryAddress, paymentLovelace.toString());
      }
    }
    
    // Build, sign, and submit
    const unsignedTx = await tx.build();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);
    
    return txHash;
  } catch (error) {
    console.error('Simple mint error:', error);
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
