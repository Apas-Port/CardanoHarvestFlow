'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import type { Asset } from '@meshsdk/common'

interface WalletAccount {
  address: string
  balance: string
  stakeAddress?: string
  index: number
}

interface WalletAccountSelectorProps {
  onAccountSelect?: (address: string) => void
}

export default function WalletAccountSelector({ onAccountSelect }: WalletAccountSelectorProps) {
  const { connected, wallet } = useWallet()
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showAccountList, setShowAccountList] = useState(false)

  const hasGetAccounts = (
    value: unknown
  ): value is { getAccounts: () => Promise<unknown> } => {
    return typeof value === 'object' && value !== null && typeof (value as { getAccounts?: unknown }).getAccounts === 'function'
  }

  const fetchAccounts = useCallback(async () => {
    if (!wallet) return
    
    setLoading(true)
    setError('')

    try {
      const accounts: WalletAccount[] = []
      
      // Try to get multiple addresses
      try {
        // Get used addresses
        const usedAddresses = await wallet.getUsedAddresses()
        console.log('Used addresses:', usedAddresses)
        
        // Get unused addresses (for new accounts)
        let unusedAddresses: string[] = []
        if (typeof wallet.getUnusedAddresses === 'function') {
          unusedAddresses = await wallet.getUnusedAddresses()
          console.log('Unused addresses:', unusedAddresses)
        }
        
        // Combine all addresses
        const allAddresses = [...usedAddresses, ...unusedAddresses]
        
        // For each address, get balance
        for (let i = 0; i < allAddresses.length && i < 10; i++) { // Limit to 10 accounts
          const address = allAddresses[i]
          
          try {
            // Try to get balance for this specific address
            let balance = '0'
            
            // Get all assets and calculate balance
            if (typeof wallet.getAssets === 'function') {
              const assets = await wallet.getAssets() as Asset[]
              const adaAsset = assets.find((asset) => asset.unit === 'lovelace')
              if (adaAsset) {
                balance = (parseInt(adaAsset.quantity) / 1000000).toFixed(2)
              }
            }
            
            // Get stake address if available
            let stakeAddress = ''
            if (typeof wallet.getRewardAddresses === 'function') {
              const rewardAddresses = await wallet.getRewardAddresses()
              if (rewardAddresses.length > 0) {
                stakeAddress = rewardAddresses[0]
              }
            }
            
            accounts.push({
              address,
              balance: balance + ' ADA',
              stakeAddress,
              index: i
            })
          } catch (e) {
            console.error('Error fetching account details:', e)
          }
        }
        
        // If we only found one account, try to check if wallet supports account discovery
        if (accounts.length <= 1) {
          // For Yoroi, we might need to use a different approach
          const walletName = localStorage.getItem('connectedWallet')
          
          if (walletName === 'yoroi' && window.cardano?.yoroi) {
            console.log('Trying Yoroi-specific account discovery...')
            
            // Yoroi might expose multiple accounts through different methods
            // This is wallet-specific and may vary
            try {
              // Try to get collateral if supported
              if (typeof wallet.getCollateral === 'function') {
                const collateral = await wallet.getCollateral()
                console.log('Collateral addresses:', collateral)
              }
              
              // Some wallets expose account switching
              if (hasGetAccounts(wallet)) {
                const walletAccounts = await wallet.getAccounts()
                console.log('Wallet accounts:', walletAccounts)
              }
            } catch (e) {
              console.log('Extended account discovery not supported:', e)
            }
          }
        }
        
      } catch (error) {
        console.error('Error fetching addresses:', error)
        
        // Fallback: just get the current address
        let currentAddress = ''
        if (typeof wallet.getChangeAddress === 'function') {
          currentAddress = await wallet.getChangeAddress()
        }
        
        if (currentAddress) {
          accounts.push({
            address: currentAddress,
            balance: 'Unknown',
            index: 0
          })
        }
      }
      
      setAccounts(accounts)
      
      // Select first account by default
      if (accounts.length > 0) {
        setSelectedAccount((prev) => {
          if (prev) {
            return prev
          }
          onAccountSelect?.(accounts[0].address)
          return accounts[0].address
        })
      }

    } catch (error) {
      console.error('Error fetching accounts:', error)
      setError(error instanceof Error ? error.message : 'アカウントの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [wallet, onAccountSelect])

  useEffect(() => {
    if (connected && wallet) {
      void fetchAccounts()
    }
  }, [connected, wallet, fetchAccounts])

  const handleAccountSelect = (address: string) => {
    setSelectedAccount(address)
    setShowAccountList(false)
    onAccountSelect?.(address)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 15)}...${addr.slice(-10)}`
  }

  if (!connected) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">ウォレットアカウント</h3>
        <button
          onClick={fetchAccounts}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          更新
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 text-sm mt-2">アカウントを読み込み中...</p>
        </div>
      ) : (
        <>
          {accounts.length > 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {accounts.length}個のアカウントが見つかりました
              </p>
              
              {!showAccountList ? (
                <div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">選択中のアカウント</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {formatAddress(selectedAccount)}
                    </p>
                    {accounts.find(a => a.address === selectedAccount)?.balance && (
                      <p className="text-xs text-gray-500 mt-1">
                        残高: {accounts.find(a => a.address === selectedAccount)?.balance}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAccountList(true)}
                    className="mt-3 w-full text-sm bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                  >
                    別のアカウントを選択
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    アカウントを選択してください：
                  </p>
                  {accounts.map((account) => (
                    <button
                      key={account.address}
                      onClick={() => handleAccountSelect(account.address)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedAccount === account.address
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            アカウント {account.index + 1}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 font-mono">
                            {formatAddress(account.address)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {account.balance}
                          </p>
                        </div>
                        {selectedAccount === account.address && (
                          <span className="text-blue-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAccountList(false)}
                    className="w-full text-sm text-gray-600 hover:text-gray-700 py-2"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          ) : accounts.length === 1 ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                1個のアカウントのみ利用可能です
              </p>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                {formatAddress(accounts[0].address)}
              </p>
              {accounts[0].balance && (
                <p className="text-xs text-gray-500 mt-1">
                  残高: {accounts[0].balance}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              アカウントが見つかりません
            </p>
          )}
          
          {accounts.length === 1 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>注意:</strong> Yoroiウォレットで複数のアカウントを使用するには、
                Yoroi側でアカウントを切り替えてから再接続する必要がある場合があります。
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
