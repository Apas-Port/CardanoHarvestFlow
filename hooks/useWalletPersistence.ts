import { useEffect, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';

export const WALLET_STORAGE_KEY = 'connectedWallet';
export const WALLET_ADDRESS_KEY = 'walletAddress';

export function useWalletPersistence() {
  const { connect, connected, name, disconnect } = useWallet();

  // Auto-reconnect on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const autoReconnect = async () => {
      const savedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
      
      if (savedWallet && !connected) {
        // Wait a bit for wallet extensions to fully load
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if the wallet extension is available
        if (window.cardano && window.cardano[savedWallet]) {
          try {
            console.log(`Auto-reconnecting to ${savedWallet}...`);
            await connect(savedWallet);
          } catch (error) {
            console.error('Failed to auto-reconnect:', error);
            // Clear invalid saved wallet data
            localStorage.removeItem(WALLET_STORAGE_KEY);
            localStorage.removeItem(WALLET_ADDRESS_KEY);
          }
        } else {
          console.log(`Wallet extension ${savedWallet} not found`);
        }
      }
    };

    autoReconnect();
  }, []); // Run only once on mount

  // Save wallet name when connected
  useEffect(() => {
    if (connected && name) {
      localStorage.setItem(WALLET_STORAGE_KEY, name);
      console.log(`Saved wallet: ${name}`);
    }
  }, [connected, name]);

  // Enhanced connect function that saves wallet info
  const connectAndSave = useCallback(async (walletName: string) => {
    try {
      await connect(walletName);
      localStorage.setItem(WALLET_STORAGE_KEY, walletName);
      return true;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }, [connect]);

  // Enhanced disconnect function that clears saved data
  const disconnectAndClear = useCallback(async () => {
    try {
      localStorage.removeItem(WALLET_STORAGE_KEY);
      localStorage.removeItem(WALLET_ADDRESS_KEY);
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [disconnect]);

  return {
    connectAndSave,
    disconnectAndClear,
    savedWallet: typeof window !== 'undefined' ? localStorage.getItem(WALLET_STORAGE_KEY) : null,
    savedAddress: typeof window !== 'undefined' ? localStorage.getItem(WALLET_ADDRESS_KEY) : null
  };
}