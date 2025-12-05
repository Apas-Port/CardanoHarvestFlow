import { useState, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { cardanoPaymentService } from '@/lib/cardano-payment-service';

export interface PaymentStatus {
  status: 'idle' | 'preparing' | 'signing' | 'submitting' | 'success' | 'error';
  txHash?: string;
  error?: string;
}

export function useCardanoPayment() {
  const { connected, name: walletName } = useWallet();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'idle' });
  const [isProcessing, setIsProcessing] = useState(false);

  const sendPayment = useCallback(async (
    recipientAddress: string,
    amountInAda: number
  ) => {
    if (!connected || !walletName) {
      setPaymentStatus({ 
        status: 'error', 
        error: 'Please connect your wallet first' 
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus({ status: 'preparing' });

    try {
      // Connect the service to the wallet
      await cardanoPaymentService.connectWallet(walletName);

      // Check wallet balance
      const balance = await cardanoPaymentService.getWalletBalance();
      const totalCost = amountInAda + 2; // Add 2 ADA for transaction fee

      if (balance < totalCost) {
        throw new Error(`Insufficient balance. You need at least ${totalCost} ADA (including fees)`);
      }

      setPaymentStatus({ status: 'signing' });

      // Send the payment
      const txHash = await cardanoPaymentService.sendPayment(
        recipientAddress,
        amountInAda
      );

      setPaymentStatus({ 
        status: 'success', 
        txHash: txHash
      });

      return txHash;
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to send payment' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [connected, walletName]);

  const resetPaymentStatus = useCallback(() => {
    setPaymentStatus({ status: 'idle' });
  }, []);

  return {
    sendPayment,
    paymentStatus,
    isProcessing,
    resetPaymentStatus
  };
}