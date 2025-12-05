'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'
import type { Asset } from '@meshsdk/common'

// Wallet configurations
const SUPPORTED_WALLETS = [
  {
    name: 'nami',
    displayName: 'Nami',
    color: 'from-orange-400 to-orange-600',
    window: 'nami'
  },
  {
    name: 'lace',
    displayName: 'Lace',
    color: 'from-purple-400 to-purple-600',
    window: 'lace'
  },
  {
    name: 'eternl',
    displayName: 'Eternl',
    color: 'from-blue-400 to-blue-600',
    window: 'eternl'
  },
  {
    name: 'flint',
    displayName: 'Flint',
    color: 'from-red-400 to-red-600',
    window: 'flint'
  },
  {
    name: 'yoroi',
    displayName: 'Yoroi',
    color: 'from-cyan-400 to-cyan-600',
    window: 'yoroi'
  },
  {
    name: 'typhoncip30',
    displayName: 'Typhon',
    color: 'from-gray-400 to-gray-600',
    window: 'typhoncip30'
  }
]

type BalanceEntry = {
  unit: string
  quantity: string
}

type WalletUtxo = {
  output?: {
    amount?: BalanceEntry[] | string
  }
  amount?: string | number
}

const sumLovelaceFromUtxos = (utxos: unknown[]): number => {
  return utxos.reduce<number>((total, utxo) => {
    if (!utxo || typeof utxo !== 'object') {
      return total
    }

    const candidate = utxo as WalletUtxo

    if (candidate.output?.amount) {
      const amount = candidate.output.amount

      if (Array.isArray(amount)) {
        const lovelaceEntry = amount.find((entry): entry is BalanceEntry => {
          return Boolean(entry) && entry.unit === 'lovelace' && typeof entry.quantity === 'string'
        })

        if (lovelaceEntry) {
          const parsed = parseInt(lovelaceEntry.quantity, 10)
          return total + (Number.isNaN(parsed) ? 0 : parsed)
        }
      }

      if (typeof amount === 'string') {
        const parsed = parseInt(amount, 10)
        return total + (Number.isNaN(parsed) ? 0 : parsed)
      }
    }

    if (typeof candidate.amount === 'string' || typeof candidate.amount === 'number') {
      const parsed = typeof candidate.amount === 'string'
        ? parseInt(candidate.amount, 10)
        : candidate.amount

      return total + (Number.isNaN(parsed) ? 0 : parsed)
    }

    return total
  }, 0)
}


export default function WalletConnect() {
  const { connected, wallet, disconnect, connect } = useWallet()
  const [balance, setBalance] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [stakeAddress, setStakeAddress] = useState<string>('')
  const [network, setNetwork] = useState<string>('')
  const [walletName, setWalletName] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showWalletList, setShowWalletList] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<typeof SUPPORTED_WALLETS>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [isGettingWalletInfo, setIsGettingWalletInfo] = useState(false)

  const checkAvailableWallets = useCallback(async () => {
    const available = []
    let debug = 'Wallet detection debug:\n'
    
    // Check if window.cardano exists
    if (typeof window !== 'undefined' && window.cardano) {
      debug += 'window.cardano found\n'
      
      for (const walletConfig of SUPPORTED_WALLETS) {
        try {
          // Direct check on window.cardano
          const walletExists = window.cardano[walletConfig.window] !== undefined
          debug += `${walletConfig.displayName} (${walletConfig.window}): ${walletExists ? 'Found' : 'Not found'}\n`
          
          if (walletExists) {
            available.push(walletConfig)
          }
        } catch (e) {
          debug += `${walletConfig.displayName}: Error checking - ${e}\n`
        }
      }
    } else {
      debug += 'window.cardano not found - waiting for extensions to load\n'
      
      // Wait a bit for extensions to load
      setTimeout(() => {
        void checkAvailableWallets()
      }, 1000)
    }
    
    setDebugInfo(debug)
    setAvailableWallets(available)
  }, [])

  const connectWallet = useCallback(async (walletName: string) => {
    setConnecting(walletName)
    setError('')
    try {
      // Connect using the wallet name
      await connect(walletName)
      setShowWalletList(false)
      
      // Save connected wallet to localStorage
      localStorage.setItem('connectedWallet', walletName)
      
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect wallet')
      // Remove from localStorage if connection failed
      localStorage.removeItem('connectedWallet')
    } finally {
      setConnecting(null)
    }
  }, [connect])

  const getWalletInfo = useCallback(async () => {
    if (!wallet || isGettingWalletInfo) return
    
    console.log('getWalletInfo called')
    setIsGettingWalletInfo(true)
    setLoading(true)
    setError('')

    // Set timeout for loading wallet info
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setError('ウォレット情報の読み込みがタイムアウトしました。ウォレットを再選択してください。')
      // Disconnect and clear saved wallet
      localStorage.removeItem('connectedWallet')
      disconnect()
      setIsGettingWalletInfo(false)
    }, 15000) // 15 seconds timeout

    try {
      // Get balance - Try different methods based on wallet type
      let ada = 0;
      
      try {
        // Method 1: Try getBalance if available
        if (typeof wallet.getBalance === 'function') {
          console.log('Using getBalance method')
          const balances = await wallet.getBalance() as BalanceEntry[]
          console.log('Balances:', balances)
          const lovelaceBalance = balances.find((balance) => balance.unit === 'lovelace')
          if (lovelaceBalance) {
            ada = parseInt(lovelaceBalance.quantity) / 1000000
          }
        }
        // Method 2: Try getAssets if available
        else if (typeof wallet.getAssets === 'function') {
          console.log('Using getAssets method')
          const assets = await wallet.getAssets() as Asset[]
          console.log('Assets:', assets)
          const adaAsset = assets.find((asset) => asset.unit === 'lovelace')
          if (adaAsset) {
            ada = parseInt(adaAsset.quantity) / 1000000
          }
        }
        // Method 3: Try getUtxos and calculate balance
        else if (typeof wallet.getUtxos === 'function') {
          console.log('Using getUtxos method')
          const utxos = await wallet.getUtxos()
          console.log('UTxOs:', utxos) // Debug log
          
          const utxoArray = Array.isArray(utxos) ? utxos : []
          const totalLovelace = sumLovelaceFromUtxos(utxoArray)
          ada = totalLovelace / 1000000
        }

        // If balance is 0, try all methods to ensure we get the correct balance
        if (ada === 0) {
          console.log('Balance is 0, trying all available methods...')
          
          // Try all methods regardless of what's available
          try {
            if (typeof wallet.getAssets === 'function' && ada === 0) {
              console.log('Retrying with getAssets...')
              const assets = await wallet.getAssets() as Asset[]
              const adaAsset = assets.find((asset) => asset.unit === 'lovelace')
              if (adaAsset) {
                ada = parseInt(adaAsset.quantity) / 1000000
              }
            }
          } catch (e) {
            console.log('getAssets failed:', e)
          }

          try {
            if (typeof wallet.getUtxos === 'function' && ada === 0) {
              console.log('Retrying with getUtxos...')
              const utxos = await wallet.getUtxos()
              const utxoArray = Array.isArray(utxos) ? utxos : []
              const totalLovelace = sumLovelaceFromUtxos(utxoArray)
              if (totalLovelace > 0) {
                ada = totalLovelace / 1000000
              }
            }
          } catch (e) {
            console.log('getUtxos failed:', e)
          }
        }
        
        console.log('Final calculated ADA balance:', ada) // Debug log
        setBalance(ada.toFixed(2))
      } catch (error) {
        // Log available methods for debugging
        console.log('Available wallet methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(wallet)))
        
        // If it's a Yoroi connection error, show specific message
        if (error instanceof Error && error.message.includes('site not connected yet')) {
          throw new Error('Yoroiウォレットの接続を承認してください')
        } else {
          throw error
        }
      }

      // Get addresses - try different methods
      try {
        if (typeof wallet.getUsedAddresses === 'function') {
          const addresses = await wallet.getUsedAddresses()
          if (addresses.length > 0) {
            setAddress(addresses[0])
          }
        } else if (typeof wallet.getChangeAddress === 'function') {
          const address = await wallet.getChangeAddress()
          setAddress(address)
        }
      } catch (addressError) {
        console.error('Error getting address:', addressError)
      }

      // Get reward addresses (stake address) - try if available
      try {
        if (typeof wallet.getRewardAddresses === 'function') {
          const rewardAddresses = await wallet.getRewardAddresses()
          if (rewardAddresses.length > 0) {
            setStakeAddress(rewardAddresses[0])
          }
        }
      } catch (stakeError) {
        console.error('Error getting stake address:', stakeError)
      }

      // Get network
      try {
        if (typeof wallet.getNetworkId === 'function') {
          const networkId = await wallet.getNetworkId()
          console.log('Network ID:', networkId) // Debug log
          
          // Cardano network IDs:
          // 0 = Testnet (legacy)
          // 1 = Mainnet
          // 2 = Preprod (current testnet)
          let networkName = 'Unknown'
          switch (networkId) {
            case 0:
              networkName = 'Testnet'
              break
            case 1:
              networkName = 'Mainnet'
              break
            case 2:
              networkName = 'Preprod'
              break
            default:
              networkName = `Network ${networkId}`
          }
          setNetwork(networkName)
        }
      } catch (networkError) {
        console.error('Error getting network:', networkError)
      }

      // Get wallet name from connected wallet
      // Since we can't directly get the name, we'll use the wallet instance type
      setWalletName('Connected Wallet')
      
      // Clear timeout on success
      clearTimeout(timeoutId)
      setIsGettingWalletInfo(false)

    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId)
      
      console.error('Error getting wallet info:', error)
      if (error instanceof Error) {
        if (error.message.includes('site not connected yet')) {
          setError('Yoroiウォレットの接続を承認してください。承認後、再度「ウォレット情報を更新」ボタンをクリックしてください。')
        } else {
          setError(error.message)
        }
      } else {
        setError('Unknown error')
      }
      setIsGettingWalletInfo(false)
    } finally {
      setLoading(false)
    }
  }, [wallet, isGettingWalletInfo, disconnect])

  useEffect(() => {
    void checkAvailableWallets()

    if (!connected) {
      const savedWallet = localStorage.getItem('connectedWallet')
      if (savedWallet) {
        const timeoutId = window.setTimeout(() => {
          void connectWallet(savedWallet)
        }, 500)

        return () => clearTimeout(timeoutId)
      }
    }

    return undefined
  }, [checkAvailableWallets, connectWallet, connected])

  useEffect(() => {
    void checkAvailableWallets()
  }, [showWalletList, checkAvailableWallets])

  useEffect(() => {
    if (connected && wallet) {
      void getWalletInfo()
    }
  }, [connected, wallet, getWalletInfo])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatAddress = (addr: string, length: number = 15) => {
    return `${addr.slice(0, length)}...${addr.slice(-length)}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl p-6">
        <h2 className="text-2xl font-bold text-white">Cardano Wallet</h2>
        <p className="text-blue-100 mt-1">接続状態とウォレット情報</p>
      </div>
      
      <div className="bg-white rounded-b-xl shadow-xl border border-gray-200">
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">エラー:</span> {error}
            </div>
          </div>
        )}
        
        {!connected ? (
          <div className="p-8">
            {!showWalletList ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-6">ウォレットを接続してください</p>
                </div>
                <button
                  onClick={() => setShowWalletList(true)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <button
                    onClick={() => setShowWalletList(false)}
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    戻る
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ウォレットを選択</h3>
                
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mb-4 text-xs bg-gray-100 p-3 rounded">
                    <summary className="cursor-pointer font-mono">Debug Info</summary>
                    <pre className="mt-2 whitespace-pre-wrap">{debugInfo}</pre>
                  </details>
                )}
                
                {availableWallets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">利用可能なウォレットが見つかりません</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Cardanoウォレット拡張機能をインストールしてください
                    </p>
                    <button
                      onClick={checkAvailableWallets}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      再度検出を試す
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableWallets.map((wallet) => (
                      <button
                        key={wallet.name}
                        onClick={() => connectWallet(wallet.name)}
                        disabled={connecting !== null}
                        className={`relative p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all ${
                          connecting === wallet.name ? 'opacity-75' : 'hover:shadow-md'
                        } disabled:cursor-not-allowed`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${wallet.color} opacity-10 rounded-lg`}></div>
                        <div className="relative">
                          <p className="font-medium text-gray-800">{wallet.displayName}</p>
                          {connecting === wallet.name && (
                            <div className="mt-2">
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-6 text-center">
                  <a
                    href="https://www.cardano.org/what-is-ada/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    ウォレットをお持ちでない方はこちら
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 mb-2">情報を読み込み中...</p>
                <p className="text-xs text-gray-500 mb-4">
                  ウォレットの承認が必要な場合があります
                </p>
                <button
                  onClick={() => {
                    setLoading(false)
                    setError('読み込みをキャンセルしました')
                    localStorage.removeItem('connectedWallet')
                    disconnect()
                  }}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  キャンセルして戻る
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium">接続済み</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      {walletName}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      network === 'Mainnet' ? 'bg-green-100 text-green-700' :
                      network === 'Preprod' ? 'bg-orange-100 text-orange-700' :
                      network === 'Preview' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {network}
                    </span>
                  </div>
                </div>

                {/* Balance */}
                {balance && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">残高</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">{balance}</span>
                      <span className="text-lg text-gray-600">ADA</span>
                    </div>
                  </div>
                )}

                {/* Wallet Address */}
                {address && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">ウォレットアドレス</p>
                        <button
                          onClick={() => copyToClipboard(address)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          コピー
                        </button>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-lg font-mono text-xs break-all">
                        {formatAddress(address)}
                      </div>
                    </div>

                    {/* Stake Address */}
                    {stakeAddress && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600">ステークアドレス</p>
                          <button
                            onClick={() => copyToClipboard(stakeAddress)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            コピー
                          </button>
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg font-mono text-xs break-all">
                          {formatAddress(stakeAddress, 10)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Disconnect Button */}
                <button
                  onClick={() => {
                    localStorage.removeItem('connectedWallet')
                    disconnect()
                  }}
                  className="w-full mt-6 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  ウォレットを切断
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
