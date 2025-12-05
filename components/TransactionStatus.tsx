'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'

interface TransactionInfo {
  status: 'pending' | 'confirmed' | 'failed'
  confirmations: number
  timestamp?: string
  error?: string
}

interface TransactionStatusProps {
  txHash: string
  autoRefresh?: boolean
  refreshInterval?: number
  onStatusChange?: (info: TransactionInfo) => void
}

export function TransactionStatus({ 
  txHash, 
  autoRefresh = true, 
  refreshInterval = 5000,
  onStatusChange 
}: TransactionStatusProps) {
  const { wallet } = useWallet()
  const [txInfo, setTxInfo] = useState<TransactionInfo>({
    status: 'pending',
    confirmations: 0
  })
  const [loading, setLoading] = useState(false)

  const checkTransactionStatus = useCallback(async () => {
    if (!wallet || !txHash) return

    setLoading(true)
    try {
      // トランザクション情報を取得するためのAPIコール
      // ここではモックの実装を提供します
      // 実際のプロダクションでは、Blockfrost APIやKoios APIを使用することを推奨します
      
      // モック実装: 時間経過で確認数を増やす
      const timePassed = Date.now() - parseInt(localStorage.getItem(`tx_${txHash}_time`) || Date.now().toString())
      const mockConfirmations = Math.min(Math.floor(timePassed / 30000), 10) // 30秒ごとに1確認

      const newInfo: TransactionInfo = {
        status: mockConfirmations > 0 ? 'confirmed' : 'pending',
        confirmations: mockConfirmations,
        timestamp: new Date().toISOString()
      }

      setTxInfo(newInfo)
      
      if (onStatusChange && 
          (newInfo.status !== txInfo.status || newInfo.confirmations !== txInfo.confirmations)) {
        onStatusChange(newInfo)
      }

    } catch (error) {
      console.error('Error checking transaction status:', error)
      setTxInfo({
        status: 'failed',
        confirmations: 0,
        error: error instanceof Error ? error.message : '不明なエラー'
      })
    } finally {
      setLoading(false)
    }
  }, [wallet, txHash, onStatusChange, txInfo])

  useEffect(() => {
    // 初回チェック
    void checkTransactionStatus()
    
    // トランザクション時刻を保存（モック用）
    if (!localStorage.getItem(`tx_${txHash}_time`)) {
      localStorage.setItem(`tx_${txHash}_time`, Date.now().toString())
    }

    // 自動更新の設定
    if (autoRefresh && txInfo.status === 'pending') {
      const interval = setInterval(checkTransactionStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [txHash, autoRefresh, refreshInterval, txInfo.status, checkTransactionStatus])

  const getStatusColor = () => {
    switch (txInfo.status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
    }
  }

  const getStatusText = () => {
    switch (txInfo.status) {
      case 'confirmed':
        return `確認済み (${txInfo.confirmations}確認)`
      case 'pending':
        return '処理中...'
      case 'failed':
        return '失敗'
    }
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">トランザクションステータス</h4>
        <button
          onClick={checkTransactionStatus}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          {txInfo.status === 'pending' && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
          )}
        </div>
        
        <div className="text-xs text-gray-600">
          <p className="font-mono break-all">TX: {txHash.substring(0, 20)}...</p>
          {txInfo.timestamp && (
            <p>最終更新: {new Date(txInfo.timestamp).toLocaleTimeString('ja-JP')}</p>
          )}
        </div>
        
        {txInfo.error && (
          <div className="text-xs text-red-600 mt-2">
            エラー: {txInfo.error}
          </div>
        )}
        
        <div className="mt-2">
          <a
            href={`https://cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Cardanoscanで確認 →
          </a>
        </div>
      </div>
    </div>
  )
}
