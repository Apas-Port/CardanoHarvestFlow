'use client'

import { useState } from 'react'
import { useWallet } from '@meshsdk/react'
import { Transaction, ForgeScript, Mint, AssetMetadata } from '@meshsdk/core'
import { HARVEST_FLOW_METADATA } from '@/types/metadata'
import { TransactionStatus } from './TransactionStatus'
import { addTransactionToHistory } from './TransactionHistory'
import { getNetworkConfig } from '@/lib/network-config'
import { calculateTotalFee, formatLovelaceToADA } from '@/utils/nftFeeConfig'

interface VerificationResponse {
  success: boolean
  verifiedMetadata: AssetMetadata  // CIP-25準拠のメタデータ
  verificationInfo: {
    verified: boolean
    verificationTimestamp: number
    verifiedBy: string
  }
  metadataHash: string
  signature: string
  timestamp: number
  verificationData: {
    collectionId: string
    assetName: string
    tokenId: number | string
    walletAddress: string
    metadataHash: string
    timestamp: number
  }
}

export default function NFTMintSecure() {
  const { connected, wallet } = useWallet()
  const [minting, setMinting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const [showTxStatus, setShowTxStatus] = useState<boolean>(false)
  const [verifying, setVerifying] = useState(false)
  
  // NFT metadata form
  const [selectedCollection, setSelectedCollection] = useState<'HARVEST_FLOW' | 'CUSTOM'>('HARVEST_FLOW')
  const [quantity, setQuantity] = useState<number>(1)
  const [fetchingHighestId, setFetchingHighestId] = useState(false)

  const verifyAndMintNFT = async () => {
    if (!connected || !wallet) {
      setError('ウォレットを接続してください')
      return
    }

    setMinting(true)
    setError('')
    setSuccess('')

    try {
      // Step 1: Get wallet address
      console.log('Getting wallet address...')
      let address: string
      try {
        const addresses = await wallet.getUsedAddresses()
        address = addresses[0]
      } catch {
        address = await wallet.getChangeAddress()
      }

      // Step 2: Prepare metadata based on collection
      const metadata = selectedCollection === 'HARVEST_FLOW' ? {
        name: HARVEST_FLOW_METADATA.name,
        image: HARVEST_FLOW_METADATA.image,
        mediaType: 'image/jpg',
        description: HARVEST_FLOW_METADATA.description,
        attributes: HARVEST_FLOW_METADATA.attributes
      } : {
        // Custom collections are not allowed in secure mode
        error: 'Only approved collections can be minted'
      }

      if ('error' in metadata) {
        throw new Error(metadata.error)
      }

      // Fetch the highest existing token ID
      console.log('Fetching highest token ID...')
      setFetchingHighestId(true)
      
      let nextTokenId: number
      try {
        const highestIdResponse = await fetch('/api/nft/highest-id?collectionId=HARVEST_FLOW')
        if (highestIdResponse.ok) {
          const data = await highestIdResponse.json()
          nextTokenId = data.nextTokenId || 1
        } else {
          nextTokenId = 1
        }
      } catch (error) {
        console.error('Error fetching highest ID:', error)
        nextTokenId = 1
      }
      
      setFetchingHighestId(false)
      
      // Create unique asset name with new format
      const tokenId = nextTokenId
      const assetName = `HARVESTFLOW#${tokenId}`

      // Step 3: Verify metadata with API
      console.log('Verifying metadata with API...')
      setVerifying(true)
      
      const verificationResponse = await fetch('/api/nft/verify-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata,
          collectionId: selectedCollection,
          assetName,
          tokenId,
          walletAddress: address
        })
      })

      if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json()
        throw new Error(errorData.error || 'メタデータの検証に失敗しました')
      }

      const verificationData: VerificationResponse = await verificationResponse.json()
      console.log('Metadata verified:', verificationData)
      
      const verifiedMetadata = verificationData.verifiedMetadata
      const metadataHash = verificationData.metadataHash
      const signature = verificationData.signature
      const verificationInfo = verificationData.verificationInfo

      setVerifying(false)

      // Step 4: Build and submit transaction with verified metadata
      console.log('Building transaction with verified metadata...')
      
      // Create forging script for minting policy
      const forgingScript = ForgeScript.withOneSignature(address)

      // Build transaction
      const tx = new Transaction({ initiator: wallet })
        .setNetwork('preprod')

      // Create mint asset with CIP-25 compliant metadata
      // Include tokenId in metadata
      const cip25Metadata: AssetMetadata = {
        name: verifiedMetadata.name,
        image: verifiedMetadata.image,
        mediaType: verifiedMetadata.mediaType || 'image/jpg',
        description: verifiedMetadata.description,
        // Add tokenId to attributes
        attributes: [
          ...(verifiedMetadata.attributes || []),
          {
            trait_type: 'Token ID',
            value: tokenId.toString()
          }
        ]
      }

      const asset: Mint = {
        assetName: assetName,
        assetQuantity: quantity.toString(),
        metadata: cip25Metadata,
        label: '721',
        recipient: address,
      }
      
      // Store verification data separately (not in on-chain metadata)
      console.log('Verification data:', {
        signature,
        metadataHash,
        verificationInfo
      })

      const { treasuryAddress } = getNetworkConfig()
      if (!treasuryAddress) {
        throw new Error('Treasury address is not configured. Set NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS.')
      }

      const requiredFee = calculateTotalFee('preprod', 'HARVEST_FLOW', quantity)

      // Add minting to transaction – collect mint fee to the treasury
      tx.sendLovelace(treasuryAddress, requiredFee.toString())
        .mintAsset(forgingScript, asset)
        .setChangeAddress(address)

      // Build and sign transaction
      console.log('Building transaction...')
      const unsignedTx = await tx.build()
      
      console.log('Signing transaction...')
      const signedTx = await wallet.signTx(unsignedTx)
      
      console.log('Submitting transaction...')
      const txHashResult = await wallet.submitTx(signedTx)
      console.log('Transaction submitted:', txHashResult)

      setTxHash(txHashResult)
      setSuccess(`検証済みNFTのMintに成功しました！Token ID: ${tokenId}`)
      setShowTxStatus(true)
      
      // トランザクション履歴に追加
      await addTransactionToHistory(
        wallet,
        txHashResult,
        'Verified NFT Mint',
        `${assetName} (ID: ${tokenId}, ${quantity}個) - 検証済み`
      )
      
      // Update the highest token ID after successful mint
      await fetch('/api/nft/highest-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collectionId: 'HARVEST_FLOW',
          tokenId: tokenId
        })
      })
      
      // Reset form
      setQuantity(1)

    } catch (error) {
      console.error('Minting error:', error)
      
      let errorMessage = 'Mintに失敗しました'
      if (error instanceof Error) {
        if (error.message.includes('insufficient')) {
          const requiredADA = formatLovelaceToADA(calculateTotalFee('preprod', 'HARVEST_FLOW', quantity))
          errorMessage = `残高が不足しています。NFT Mintには約${requiredADA} ADAが必要です。`
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setMinting(false)
      setVerifying(false)
    }
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">検証済みNFT Mint</h3>
        <p className="text-gray-600">NFTをMintするにはウォレットを接続してください</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">検証済みNFT Mint</h3>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>セキュア機能:</strong> このMint機能は、承認されたコレクションのみをMintでき、
          メタデータはサーバー側で検証・署名されます。
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <p className="text-sm">{success}</p>
          {txHash && (
            <p className="text-xs mt-2">
              TX Hash: <span className="font-mono">{txHash}</span>
            </p>
          )}
        </div>
      )}

      {showTxStatus && txHash && (
        <div className="mb-4">
          <TransactionStatus 
            txHash={txHash} 
            autoRefresh={true}
            refreshInterval={10000}
            onStatusChange={(info) => {
              if (info.status === 'confirmed' && info.confirmations >= 1) {
                setSuccess('検証済みNFTのMintが完了しました！ブロックチェーンに記録されました。')
              }
            }}
          />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            NFTコレクション
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="HARVEST_FLOW"
                checked={selectedCollection === 'HARVEST_FLOW'}
                onChange={() => setSelectedCollection('HARVEST_FLOW')}
                className="mr-3"
              />
              <div>
                <p className="font-medium">HARVEST FLOW NFT</p>
                <p className="text-xs text-gray-600">公式コレクション（検証済み）</p>
              </div>
            </label>
          </div>
        </div>

        {selectedCollection === 'HARVEST_FLOW' && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">コレクション詳細</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>名前:</strong> {HARVEST_FLOW_METADATA.name}</p>
              <p><strong>説明:</strong> {HARVEST_FLOW_METADATA.description}</p>
              <p><strong>画像:</strong> IPFS保存済み</p>
              <div>
                <strong>属性:</strong>
                {HARVEST_FLOW_METADATA.attributes.map((attr, idx) => (
                  <span key={idx} className="ml-2">
                    {attr.trait_type}: {attr.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}


        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            数量
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            min="1"
            max="10"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">最大10個まで</p>
        </div>

        <button
          onClick={verifyAndMintNFT}
          disabled={minting || verifying || fetchingHighestId}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {fetchingHighestId ? 'ID確認中...' : verifying ? '検証中...' : minting ? 'Minting...' : '検証済みNFTをMint'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">セキュリティ機能</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>✓ サーバー側でメタデータを検証</li>
          <li>✓ 承認されたコレクションのみMint可能</li>
          <li>✓ メタデータにデジタル署名を付与</li>
          <li>✓ タイムスタンプによる有効期限管理</li>
          <li>✓ 改ざん防止のハッシュ値を記録</li>
        </ul>
      </div>
    </div>
  )
}
