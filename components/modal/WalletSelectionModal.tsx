import React, { useEffect, useState, useCallback } from 'react';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';

// Wallet configurations
const SUPPORTED_WALLETS = [
  {
    name: 'nami',
    displayName: 'Nami',
    color: 'from-orange-400 to-orange-600',
    window: 'nami',
    icon: '🦊'
  },
  {
    name: 'lace',
    displayName: 'Lace',
    color: 'from-purple-400 to-purple-600',
    window: 'lace',
    icon: '💜'
  },
  {
    name: 'eternl',
    displayName: 'Eternl',
    color: 'from-blue-400 to-blue-600',
    window: 'eternl',
    icon: '🔷'
  },
  {
    name: 'flint',
    displayName: 'Flint',
    color: 'from-red-400 to-red-600',
    window: 'flint',
    icon: '🔥'
  },
  {
    name: 'yoroi',
    displayName: 'Yoroi',
    color: 'from-cyan-400 to-cyan-600',
    window: 'yoroi',
    icon: '🌊'
  },
  {
    name: 'typhoncip30',
    displayName: 'Typhon',
    color: 'from-gray-400 to-gray-600',
    window: 'typhoncip30',
    icon: '🌪️'
  }
];

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletConnected: () => void;
}

const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({ isOpen, onClose, onWalletConnected }) => {
  const { connectAndSave } = useWalletPersistence();
  const [availableWallets, setAvailableWallets] = useState<typeof SUPPORTED_WALLETS>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const checkAvailableWallets = useCallback(async () => {
    const available = [];
    
    if (typeof window !== 'undefined' && window.cardano) {
      for (const walletConfig of SUPPORTED_WALLETS) {
        try {
          const walletExists = window.cardano[walletConfig.window] !== undefined;
          if (walletExists) {
            available.push(walletConfig);
          }
        } catch (e) {
          console.error(`Error checking ${walletConfig.displayName}:`, e);
        }
      }
    }
    
    setAvailableWallets(available);
    
    // If no wallets found, wait and retry
    if (available.length === 0 && isOpen) {
      setTimeout(() => {
        void checkAvailableWallets();
      }, 1000);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      void checkAvailableWallets();
    }
  }, [isOpen, checkAvailableWallets]);

  const connectWallet = async (walletName: string) => {
    setConnecting(walletName);
    setError('');
    
    try {
      const success = await connectAndSave(walletName);
      if (success) {
        onWalletConnected();
        onClose();
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setConnecting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-fade">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {availableWallets.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 mb-2">Detecting wallets...</p>
              <p className="text-sm text-gray-500">
                Make sure you have a Cardano wallet extension installed
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">Choose your preferred Cardano wallet:</p>
              <div className="space-y-3">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => connectWallet(wallet.name)}
                    disabled={connecting !== null}
                    className={`w-full relative p-4 rounded-lg border-2 transition-all ${
                      connecting === wallet.name 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    } disabled:opacity-75 disabled:cursor-not-allowed`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${wallet.color} opacity-5 rounded-lg`}></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">{wallet.displayName}</span>
                      </div>
                      {connecting === wallet.name && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <a
              href="https://www.cardano.org/what-is-ada/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Don&apos;t have a wallet? Learn more →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSelectionModal;
