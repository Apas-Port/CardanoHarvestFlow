'use client';

import React, { useState } from 'react';
import { useWalletPersistence } from '@/hooks/useWalletPersistence';
import { useInstalledCardanoWallets } from '@/hooks/useInstalledCardanoWallets';

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletConnected: () => void;
}

const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({ isOpen, onClose, onWalletConnected }) => {
  const { connectAndSave } = useWalletPersistence();
  const { wallets, status, detectedKeys, refresh } = useInstalledCardanoWallets({ enabled: isOpen });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const connectWallet = async (walletId: string) => {
    setConnecting(walletId);
    setError('');

    try {
      const success = await connectAndSave(walletId);
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

          {status === 'detecting' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 mb-2">Detecting wallets...</p>
              <p className="text-sm text-gray-500">
                Make sure you have a Cardano wallet extension installed
              </p>
            </div>
          )}

          {status === 'not-found' && (
            <div className="py-6">
              <p className="text-gray-800 font-medium mb-3 text-center">
                No Cardano wallet detected
              </p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mb-4">
                <li>Install a Cardano wallet extension (Eternl, Lace, Yoroi, ...) on a desktop browser.</li>
                <li>
                  Enable the wallet&apos;s <span className="font-medium">dApp connector</span> — Eternl and
                  Yoroi do not expose themselves to websites while it is turned off.
                </li>
                <li>Reload this page after installing or enabling the extension.</li>
              </ul>
              <p className="text-xs text-gray-500 mb-4 break-all">
                Detected <code>window.cardano</code> keys:{' '}
                {detectedKeys.length > 0 ? detectedKeys.join(', ') : 'none'}
              </p>
              <div className="text-center">
                <button
                  onClick={refresh}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Try detecting again
                </button>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <>
              <p className="text-sm text-gray-600 mb-4">Choose your preferred Cardano wallet:</p>
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => connectWallet(wallet.id)}
                    disabled={connecting !== null}
                    className={`w-full relative p-4 rounded-lg border-2 transition-all ${
                      connecting === wallet.id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    } disabled:opacity-75 disabled:cursor-not-allowed`}
                  >
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {wallet.icon && (
                          // The icon is a data-uri supplied by the extension, so next/image is not applicable.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={wallet.icon} alt="" className="w-6 h-6 rounded" />
                        )}
                        <span className="font-medium text-gray-800">{wallet.name}</span>
                      </div>
                      {connecting === wallet.id && (
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
