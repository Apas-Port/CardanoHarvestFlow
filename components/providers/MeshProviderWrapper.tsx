'use client';

import { MeshProvider } from '@meshsdk/react';
import React, { useEffect } from 'react';

interface MeshProviderWrapperProps {
  children: React.ReactNode;
}

const MeshProviderWrapper: React.FC<MeshProviderWrapperProps> = ({ children }) => {
  return (
    <MeshProvider>
      <WalletReconnector />
      {children}
    </MeshProvider>
  );
};

// Component to handle automatic wallet reconnection
const WalletReconnector: React.FC = () => {
  useEffect(() => {
    const reconnectWallet = async () => {
      const savedWallet = localStorage.getItem('connectedWallet');
      if (savedWallet && typeof window !== 'undefined' && window.cardano) {
        // Check if the saved wallet extension is available
        const walletExtension = window.cardano[savedWallet];
        if (walletExtension) {
          try {
            // The MeshProvider will handle the actual reconnection
            console.log(`Wallet ${savedWallet} found, ready for reconnection`);
          } catch (error) {
            console.error('Failed to check wallet availability:', error);
          }
        }
      }
    };

    // Delay to ensure wallet extensions are loaded
    const timeoutId = setTimeout(reconnectWallet, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
};

export default MeshProviderWrapper;