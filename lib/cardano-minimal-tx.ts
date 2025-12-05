import { BrowserWallet } from '@meshsdk/core';

// Minimal transaction to debug CBOR type error
export async function createMinimalTransaction(
  wallet: BrowserWallet,
  recipientAddress: string,
  amountInAda: number
): Promise<string> {
  try {
    console.log('Creating minimal transaction...');
    
    // Get wallet info
    const changeAddress = await wallet.getChangeAddress();
    const utxos = await wallet.getUtxos();
    
    console.log('Wallet info:', {
      changeAddress,
      utxosCount: utxos.length,
      utxos: utxos.slice(0, 2) // Log first 2 UTXOs
    });
    
    // Convert ADA to lovelace
    const lovelaceAmount = Math.floor(amountInAda * 1_000_000).toString();
    
    // Create a minimal transaction using the wallet's direct API
    // This bypasses Mesh's Transaction builder to avoid potential issues
    const tx = {
      outputs: [{
        address: recipientAddress,
        amount: [{
          unit: 'lovelace',
          quantity: lovelaceAmount
        }]
      }]
    };
    
    console.log('Transaction structure:', tx);
    
    // Try using the wallet's direct transaction building if available
    if ('experimental' in window && window.experimental?.buildTx) {
      console.log('Using experimental.buildTx...');
      const builtTx = await window.experimental.buildTx(tx);
      const signedTx = await wallet.signTx(builtTx);
      const txHash = await wallet.submitTx(signedTx);
      return txHash;
    }
    
    // Fallback: use Mesh's approach but with minimal configuration
    const { Transaction } = await import('@meshsdk/core');
    const meshTx = new Transaction({ initiator: wallet });
    
    // Just send lovelace, nothing else
    meshTx.sendLovelace(recipientAddress, lovelaceAmount);
    
    console.log('Building transaction with Mesh...');
    const unsignedTx = await meshTx.build();
    
    console.log('Unsigned transaction built, signing...');
    const signedTx = await wallet.signTx(unsignedTx);
    
    console.log('Transaction signed, submitting...');
    const txHash = await wallet.submitTx(signedTx);
    
    console.log('Transaction submitted successfully:', txHash);
    return txHash;
    
  } catch (error) {
    console.error('Minimal transaction error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        // Log any additional error properties
        ...(error as any)
      });
    }
    throw error;
  }
}

// Extended window type for experimental features
declare global {
  interface Window {
    experimental?: {
      buildTx?: (tx: any) => Promise<string>;
    };
  }
}