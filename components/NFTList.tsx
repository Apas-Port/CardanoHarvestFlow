'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@meshsdk/react'

interface NFTAsset {
  unit: string
  policyId: string
  assetName: string
  fingerprint: string
  quantity: string
  metadata?: {
    name?: string
    image?: string
    description?: string
    mediaType?: string
    attributes?: Array<{
      trait_type: string
      value: string
    }>
    [key: string]: unknown
  }
}

export default function NFTList() {
  const { connected, wallet } = useWallet()
  const [nfts, setNfts] = useState<NFTAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [expandedNft, setExpandedNft] = useState<string | null>(null)
  const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>({})

  const handleImageError = useCallback((unit: string) => {
    setHiddenImages((prev) => ({ ...prev, [unit]: true }))
  }, [])

  const fetchNFTs = useCallback(async () => {
    if (!wallet) return
    
    setHiddenImages({})
    setLoading(true)
    setError('')

    try {
      // Get all assets from wallet
      const assets = await wallet.getAssets()
      
      // Filter NFTs (assets with quantity = 1 and metadata)
      const nftAssets: NFTAsset[] = []
      
      for (const asset of assets) {
        // Parse unit to get policyId and assetName
        const policyId = asset.unit.slice(0, 56)
        const assetNameHex = asset.unit.slice(56)
        
        // Skip ADA (unit === 'lovelace')
        if (asset.unit === 'lovelace') continue
        
        // Create NFT object
        const nft: NFTAsset = {
          unit: asset.unit,
          policyId: policyId,
          assetName: assetNameHex,
          fingerprint: asset.fingerprint || '',
          quantity: asset.quantity,
        }

        // Try to fetch metadata from the blockchain
        try {
          // Decode the asset name for display
          const assetNameBytes = Buffer.from(assetNameHex, 'hex')
          const assetNameString = assetNameBytes.toString('utf8')
          
          // Check if this might be a HARVEST FLOW NFT
          const isHarvestFlow = assetNameString.includes('HarvestFlow') || 
                               assetNameString.includes('HARVEST') ||
                               assetNameString.startsWith('HF') ||
                               assetNameString.startsWith('HARVESTFLOW#')
          
          // Set metadata based on asset type
          if (isHarvestFlow) {
            // Extract token ID from asset name if available
            let tokenId = ''
            if (assetNameString.startsWith('HARVESTFLOW#')) {
              tokenId = assetNameString.substring('HARVESTFLOW#'.length)
            } else if (assetNameString.startsWith('HF')) {
              tokenId = assetNameString.substring(2)
            }
            
            // Use HARVEST FLOW metadata
            nft.metadata = {
              name: 'HARVEST FLOW NFT',
              description: 'HARVEST FLOWプロジェクトのNFTコレクション',
              image: 'ipfs://QmRzicpReutwCkM6aotuKjErFCUD213DpwPq6ByuzMJaua',
              attributes: [
                {
                  trait_type: 'シリーズ',
                  value: 'Series 1'
                },
                ...(tokenId ? [{
                  trait_type: 'Token ID',
                  value: tokenId
                }] : [])
              ]
            }
          } else {
            // Default metadata structure
            nft.metadata = {
              name: assetNameString || 'Unnamed NFT',
              description: `Policy ID: ${policyId}`,
            }
          }
          
          // Check if it's likely an NFT (quantity 1 or has specific naming)
          if (parseInt(asset.quantity) === 1 || 
              assetNameString.includes('NFT') || 
              isHarvestFlow) {
            nftAssets.push(nft)
          }
        } catch (err) {
          console.error('Error parsing asset:', err)
          // Still add the asset even if parsing fails
          if (parseInt(asset.quantity) === 1) {
            nftAssets.push(nft)
          }
        }
      }
      
      setNfts(nftAssets)
    } catch (error) {
      console.error('Error fetching NFTs:', error)
      setError(error instanceof Error ? error.message : 'NFTの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [wallet])

  useEffect(() => {
    if (connected && wallet) {
      void fetchNFTs()
    }
  }, [connected, wallet, fetchNFTs])

  const formatPolicyId = (policyId: string) => {
    return `${policyId.slice(0, 8)}...${policyId.slice(-8)}`
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert(`${label}をコピーしました`))
      .catch(() => alert('コピーに失敗しました'))
  }

  const hexToString = (hex: string) => {
    try {
      const bytes = Buffer.from(hex, 'hex')
      return bytes.toString('utf8')
    } catch {
      return hex
    }
  }

  // Convert IPFS URL to HTTPS gateway URL
  const convertIPFSUrl = (url: string): string => {
    if (!url) return ''
    
    // Check if it's an IPFS URL
    if (url.startsWith('ipfs://')) {
      // Remove 'ipfs://' and use a public gateway
      const hash = url.replace('ipfs://', '')
      // You can use various gateways: gateway.ipfs.io, cloudflare-ipfs.com, dweb.link
      return `https://gateway.ipfs.io/ipfs/${hash}`
    }
    
    // Return original URL if not IPFS
    return url
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">所有NFT一覧</h3>
        <p className="text-gray-600">NFTを表示するにはウォレットを接続してください</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">所有NFT一覧</h3>
        <button
          onClick={fetchNFTs}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          {loading ? '更新中...' : '更新'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">NFTを読み込み中...</p>
        </div>
      ) : nfts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>NFTが見つかりません</p>
          <p className="text-sm mt-2">NFTをMintするか、しばらく待ってから更新してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          {nfts.map((nft) => {
            const imageUrl = nft.metadata?.image ? convertIPFSUrl(nft.metadata.image) : ''
            const showImage = Boolean(imageUrl) && !hiddenImages[nft.unit]

            return (
              <div
                key={nft.unit}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex gap-4">
                      {showImage && (
                        <div className="flex-shrink-0">
                          <Image
                            src={imageUrl}
                            alt={nft.metadata?.name || 'NFT'}
                            width={96}
                            height={96}
                            className="w-24 h-24 object-cover rounded-lg"
                            unoptimized
                            onError={() => handleImageError(nft.unit)}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {nft.metadata?.name || hexToString(nft.assetName) || 'Unnamed NFT'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          数量: {nft.quantity}
                        </p>
                        {nft.metadata?.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {nft.metadata.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Policy ID:</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {formatPolicyId(nft.policyId)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(nft.policyId, 'Policy ID')}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          コピー
                        </button>
                      </div>

                      {nft.fingerprint && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Fingerprint:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {nft.fingerprint.slice(0, 20)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(nft.fingerprint, 'Fingerprint')}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            コピー
                          </button>
                        </div>
                      )}

                      {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">属性:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {nft.metadata.attributes.map((attr, index) => (
                              <span
                                key={index}
                                className={`text-xs px-2 py-1 rounded ${
                                  attr.trait_type === 'Token ID'
                                    ? 'bg-purple-100 text-purple-800 font-mono'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {attr.trait_type === 'Token ID' ? (
                                  <>ID: #{attr.value}</>
                                ) : (
                                  <>{attr.trait_type}: {attr.value}</>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
                
                <button
                  onClick={() => setExpandedNft(expandedNft === nft.unit ? null : nft.unit)}
                  className="ml-4 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className={`w-5 h-5 transform transition-transform ${
                      expandedNft === nft.unit ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
              
              {expandedNft === nft.unit && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Unit:</span>
                      <div className="mt-1">
                        <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                          {nft.unit}
                        </code>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Asset Name (Hex):</span>
                      <div className="mt-1">
                        <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                          {nft.assetName}
                        </code>
                      </div>
                    </div>
                    
                    {nft.metadata?.image && (
                      <div>
                        <span className="font-medium text-gray-700">画像URL:</span>
                        <div className="mt-1">
                          <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                            {convertIPFSUrl(nft.metadata.image)}
                          </code>
                        </div>
                        {nft.metadata.image.startsWith('ipfs://') && (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500">元のIPFS URL:</span>
                            <code className="text-xs bg-gray-50 p-1 rounded block break-all">
                              {nft.metadata.image}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {nft.metadata && Object.keys(nft.metadata).length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Metadata:</span>
                        <div className="mt-1">
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(nft.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>※ 表示されるのは、数量が1のアセットまたはNFTと識別されたアセットです</p>
        <p>※ メタデータの完全な取得には、追加のAPI連携が必要な場合があります</p>
      </div>
    </div>
  )
}
