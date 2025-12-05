'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { TransactionStatus } from './TransactionStatus';

interface TransactionRecord {
  txHash: string;
  timestamp: Date;
  type: string;
  description?: string;
}

type StoredTransaction = {
  txHash: string;
  timestamp: string;
  type: string;
  description?: string;
};

export function TransactionHistory() {
  const { connected, wallet } = useWallet();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const loadTransactionHistory = useCallback(async () => {
    if (!wallet) return;

    try {
      const addresses = await wallet.getUsedAddresses();
      const address = addresses[0];
      
      // ローカルストレージから履歴を取得
      const stored = localStorage.getItem(`tx_history_${address}`);
      if (stored) {
        const history = JSON.parse(stored) as StoredTransaction[];
        setTransactions(history.map((tx) => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        })));
      }
    } catch (error) {
      console.error('履歴の読み込みエラー:', error);
    }
  }, [wallet]);

  // ローカルストレージからトランザクション履歴を読み込む
  useEffect(() => {
    if (connected && wallet) {
      void loadTransactionHistory();
    }
  }, [connected, wallet, loadTransactionHistory]);

  const clearHistory = async () => {
    if (!wallet || !confirm('履歴をクリアしますか？')) return;

    try {
      const addresses = await wallet.getUsedAddresses();
      const address = addresses[0];
      
      localStorage.removeItem(`tx_history_${address}`);
      setTransactions([]);
      setSelectedTx(null);
    } catch (error) {
      console.error('履歴クリアエラー:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>トランザクション履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            履歴を表示するにはウォレットを接続してください
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>トランザクション履歴</CardTitle>
          <Button
            onClick={clearHistory}
            variant="ghost"
            size="sm"
            disabled={transactions.length === 0}
          >
            履歴をクリア
          </Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              トランザクション履歴がありません
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, index) => (
                <div
                  key={`${tx.txHash}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => setSelectedTx(tx.txHash === selectedTx ? null : tx.txHash)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tx.type}</span>
                      <code className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTxHash(tx.txHash)}
                      </code>
                    </div>
                    {tx.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {tx.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatDate(tx.timestamp)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(tx.txHash);
                    }}
                  >
                    コピー
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTx && (
        <TransactionStatus
          txHash={selectedTx}
          autoRefresh={false}
        />
      )}
    </div>
  );
}

// Export helper function for other components to add transactions
interface WalletLike {
  getUsedAddresses: () => Promise<string[]>;
}

export const addTransactionToHistory = async (
  wallet: WalletLike | null,
  txHash: string,
  type: string,
  description?: string
) => {
  if (!wallet) return;

  try {
    const addresses = await wallet.getUsedAddresses();
    const address = addresses[0];
    
    const stored = localStorage.getItem(`tx_history_${address}`);
    const history = (stored ? JSON.parse(stored) : []) as StoredTransaction[];
    
    const newTx: TransactionRecord = {
      txHash,
      timestamp: new Date(),
      type,
      description
    };

    const updatedHistory = [newTx, ...history];
    
    localStorage.setItem(
      `tx_history_${address}`,
      JSON.stringify(updatedHistory)
    );
  } catch (error) {
    console.error('履歴追加エラー:', error);
  }
};
