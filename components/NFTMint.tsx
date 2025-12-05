'use client'

import { useState } from 'react'
import { useWallet } from '@meshsdk/react'
import { Transaction, ForgeScript, Mint, AssetMetadata } from '@meshsdk/core'
import { HARVEST_FLOW_METADATA } from '@/types/metadata'
import { TransactionStatus } from './TransactionStatus'
import { addTransactionToHistory } from './TransactionHistory'
import { calculateTotalFee, formatLovelaceToADA, getFeeBreakdown } from '@/utils/nftFeeConfig'
import { getNetworkConfig } from '@/lib/network-config'

interface NFTMintProps {
  referenceUtxo?: {
    outputIndex: number
    txHash: string
  }
}

export default function NFTMint({ 
  referenceUtxo = {
    outputIndex: 1,
    txHash: 'f31a38bffc6dc2c346ea80d451f9444957ea2fa76391eca522e2d80c372930a3'
  }
}: NFTMintProps) {
  const { connected, wallet } = useWallet()
  const [minting, setMinting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const [showTxStatus, setShowTxStatus] = useState<boolean>(false)
  
  // NFT metadata form
  const [useHarvestFlowMetadata, setUseHarvestFlowMetadata] = useState<boolean>(false)
  const [nftName, setNftName] = useState<string>('')
  const [nftDescription, setNftDescription] = useState<string>('')
  const [nftImage, setNftImage] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)

  // Questions for user
  const [showQuestions, setShowQuestions] = useState(true)
  const [policyId, setPolicyId] = useState<string>('')
  const [hasExistingPolicy, setHasExistingPolicy] = useState<boolean | null>(null)

  const mintNFT = async () => {
    if (!connected || !wallet) {
      setError('ウォレットを接続してください')
      return
    }

    if (!nftName || !nftImage) {
      setError('NFT名と画像URLは必須です')
      return
    }

    setMinting(true)
    setError('')
    setSuccess('')

    try {
      console.log("start minting process")
      // Get wallet address
      const addresses = await wallet.getUsedAddresses()
      console.log("UsedAddress", addresses);
      const address = addresses[0]

      // Create metadata
      const assetMetadata: AssetMetadata = useHarvestFlowMetadata ? {
        name: HARVEST_FLOW_METADATA.name,
        image: HARVEST_FLOW_METADATA.image,
        mediaType: 'image/jpg',
        description: HARVEST_FLOW_METADATA.description,
        attributes: HARVEST_FLOW_METADATA.attributes
      } : {
        name: nftName,
        image: nftImage,
        mediaType: 'image/jpg',
        description: nftDescription
      }

      // Create asset name (must be unique)
      const assetName = useHarvestFlowMetadata ? 
        `HarvestFlow${Date.now()}` : 
        `${nftName}${Date.now()}`

      // Create forging script for minting policy
      const forgingScript = ForgeScript.withOneSignature(address)

      // Build transaction
      const tx = new Transaction({ initiator: wallet })
        .setNetwork('preprod')  // Explicitly set network

      const asset: Mint = {
        assetName: assetName,
        assetQuantity: quantity.toString(),
        metadata: assetMetadata,
        label: '721',
        recipient: address,
      }

      // Calculate required fee based on configuration
      const collectionName = useHarvestFlowMetadata ? 'HARVEST_FLOW' : 'default'
      const requiredFee = calculateTotalFee('preprod', collectionName, quantity)
      
      const { treasuryAddress } = getNetworkConfig()
      if (!treasuryAddress) {
        throw new Error('Treasury address is not configured. Set NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS.')
      }

      // IMPORTANT: First add a payment to ensure UTxO selection
      // Funds are sent to the project treasury so the user is charged the minting fee
      tx.sendLovelace(
        treasuryAddress,
        requiredFee.toString()
      )
      
      // Then add the minting
      tx.mintAsset(forgingScript, asset)
        .setChangeAddress(address)  // Explicitly set change address

      // Note: Metadata is handled by the mintAsset function with label '721'


      // Build and sign transaction
      console.log('Building transaction...')
      const unsignedTx = await tx.build()
      console.log('Transaction built successfully')
      
      console.log('Signing transaction...')
      const signedTx = await wallet.signTx(unsignedTx)
      console.log('Transaction signed successfully')
      
      console.log('Submitting transaction...')
      const txHashResult = await wallet.submitTx(signedTx)
      console.log('Transaction submitted:', txHashResult)

      setTxHash(txHashResult)
      setSuccess(`NFTのMintに成功しました！`)
      setShowTxStatus(true)
      
      // トランザクション履歴に追加
      await addTransactionToHistory(
        wallet,
        txHashResult,
        'NFT Mint',
        `${assetName} (${quantity}個)`
      );
      
      // Reset form
      setNftName('')
      setNftDescription('')
      setNftImage('')
      setQuantity(1)

    } catch (error) {
      console.error('Minting error:', error)
      
      let errorMessage = 'Mintに失敗しました'
      if (error instanceof Error) {
        // Parse specific error types
        if (error.message.includes('ValueNotConserved')) {
          errorMessage = 'トランザクションの値が不正です。ウォレットに十分なADAがあることを確認してください。'
        } else if (error.message.includes('BadInputsUTxO')) {
          errorMessage = 'UTxOの選択に失敗しました。しばらく待ってから再試行してください。'
        } else if (error.message.includes('insufficient')) {
          const collectionName = useHarvestFlowMetadata ? 'HARVEST_FLOW' : 'default'
          const requiredFee = calculateTotalFee('preprod', collectionName, quantity)
          const requiredADA = formatLovelaceToADA(requiredFee)
          errorMessage = `残高が不足しています。NFT Mintには約${requiredADA} ADAが必要です。`
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setMinting(false)
    }
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">NFT Mint</h3>
        <p className="text-gray-600">NFTをMintするにはウォレットを接続してください</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">NFT Mint</h3>
      
      {/* Reference UTXO Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-2">Reference UTXO:</p>
        <p className="text-xs font-mono break-all">
          TX: {referenceUtxo.txHash}
        </p>
        <p className="text-xs font-mono">
          Output Index: {referenceUtxo.outputIndex}
        </p>
      </div>

      {showQuestions && (
        <div className="mb-6 space-y-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-gray-800">Mint設定</h4>
          
          <div>
            <p className="text-sm text-gray-700 mb-2">
              既存のPolicy IDを使用しますか？
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setHasExistingPolicy(false)
                  setShowQuestions(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                新しいPolicyを作成
              </button>
              <button
                onClick={() => setHasExistingPolicy(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                既存のPolicyを使用
              </button>
            </div>
          </div>

          {hasExistingPolicy && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Policy ID
              </label>
              <input
                type="text"
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="既存のPolicy IDを入力"
              />
              <button
                onClick={() => setShowQuestions(false)}
                disabled={!policyId}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                続ける
              </button>
            </div>
          )}
        </div>
      )}

      {!showQuestions && (
        <>
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
                    setSuccess('NFTのMintが完了しました！ブロックチェーンに記録されました。')
                  }
                }}
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="useHarvestFlow"
                checked={useHarvestFlowMetadata}
                onChange={(e) => {
                  setUseHarvestFlowMetadata(e.target.checked)
                  if (e.target.checked) {
                    setNftName(HARVEST_FLOW_METADATA.name)
                    setNftDescription(HARVEST_FLOW_METADATA.description)
                    setNftImage(HARVEST_FLOW_METADATA.image)
                  } else {
                    setNftName('')
                    setNftDescription('')
                    setNftImage('')
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useHarvestFlow" className="text-sm font-medium text-gray-700">
                HARVEST FLOW NFTのメタデータを使用
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NFT名 *
              </label>
              <input
                type="text"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                disabled={useHarvestFlowMetadata}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="My Awesome NFT"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={nftDescription}
                onChange={(e) => setNftDescription(e.target.value)}
                disabled={useHarvestFlowMetadata}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                rows={3}
                placeholder="このNFTについての説明..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                画像URL *
              </label>
              <input
                type="text"
                value={nftImage}
                onChange={(e) => setNftImage(e.target.value)}
                disabled={useHarvestFlowMetadata}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="ipfs://... または https://..."
              />
              <p className="text-xs text-gray-500 mt-1">
                IPFS URLまたはHTTPS URLを入力してください
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-700 mb-1">必要なADA:</p>
                {(() => {
                  const collectionName = useHarvestFlowMetadata ? 'HARVEST_FLOW' : 'default'
                  const breakdown = getFeeBreakdown('preprod', collectionName, quantity)
                  return (
                    <>
                      <p className="text-gray-600">
                        合計: {formatLovelaceToADA(breakdown.total)} ADA
                      </p>
                      {breakdown.specialFee > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          特別コレクション手数料を含む
                        </p>
                      )}
                      {breakdown.bulkDiscount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          一括割引適用: -{formatLovelaceToADA(breakdown.bulkDiscount)} ADA
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={mintNFT}
                disabled={minting || !nftName || !nftImage}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {minting ? 'Minting...' : 'NFTをMint'}
              </button>
              
              <button
                onClick={() => setShowQuestions(true)}
                className="px-4 py-3 text-gray-600 hover:text-gray-800"
              >
                設定を変更
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
