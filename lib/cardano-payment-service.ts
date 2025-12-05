import { Transaction, BrowserWallet } from '@meshsdk/core';

export class CardanoPaymentService {
  private wallet: BrowserWallet | null = null;

  constructor() {}

  async connectWallet(walletName: string): Promise<void> {
    const wallet = await BrowserWallet.enable(walletName);
    this.wallet = wallet;
  }

  async sendPayment(
    recipientAddress: string,
    amountInAda: number
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // Create transaction with proper initiator
      const tx = new Transaction({ initiator: this.wallet });
      
      // Calculate payment amount in lovelace (1 ADA = 1,000,000 lovelace)
      const paymentLovelace = Math.floor(amountInAda * 1_000_000);
      
      // Add the payment output
      tx.sendLovelace(recipientAddress, paymentLovelace.toString());
      
      // Build the transaction
      const unsignedTx = await tx.build();
      
      // Sign the transaction
      const signedTx = await this.wallet.signTx(unsignedTx);
      
      // Submit the transaction
      const txHash = await this.wallet.submitTx(signedTx);
      
      return txHash;
    } catch (error) {
      console.error('Error sending payment:', error);
      // Log more detailed error information
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

  async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.wallet.getChangeAddress();
    } catch (error) {
      console.error('Error getting wallet address:', error);
      throw error;
    }
  }
}

export const cardanoPaymentService = new CardanoPaymentService();
