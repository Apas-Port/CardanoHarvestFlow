import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// 環境変数から秘密鍵を取得（実際の環境では.envファイルに設定）
const API_SECRET = process.env.NFT_API_SECRET || 'your-secret-key-here'

// 承認されたNFTコレクションの定義
const APPROVED_COLLECTIONS = {
  'HARVEST_FLOW': {
    name: 'HARVEST FLOW NFT',
    description: 'HARVEST FLOWプロジェクトのNFTコレクション',
    image: 'ipfs://QmRzicpReutwCkM6aotuKjErFCUD213DpwPq6ByuzMJaua',
    attributes: [
      {
        trait_type: 'シリーズ',
        value: 'Series 1'
      }
    ],
    maxSupply: 10000,
    // Support for new naming format
    assetNameFormat: 'HARVESTFLOW#'
  }
}

type MetadataRecord = Record<string, unknown>;

// メタデータのハッシュを生成
function generateMetadataHash(metadata: MetadataRecord): string {
  const sortedPayload = Object.keys(metadata)
    .sort()
    .reduce<MetadataRecord>((acc, key) => {
      acc[key] = metadata[key];
      return acc;
    }, {})

  const dataString = JSON.stringify(sortedPayload)
  return crypto.createHash('sha256').update(dataString).digest('hex')
}

// 署名を生成
function generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

// メタデータの検証
function validateMetadata(metadata: MetadataRecord, collectionId: string): { valid: boolean; error?: string } {
  const approvedCollection = APPROVED_COLLECTIONS[collectionId as keyof typeof APPROVED_COLLECTIONS]
  
  if (!approvedCollection) {
    return { valid: false, error: 'Unknown collection' }
  }

  // 必須フィールドのチェック
  if (typeof metadata.name !== 'string' || typeof metadata.image !== 'string') {
    return { valid: false, error: 'Missing required fields' }
  }

  // コレクションの基本情報と一致するかチェック
  if (collectionId === 'HARVEST_FLOW') {
    if (metadata.name !== approvedCollection.name) {
      return { valid: false, error: 'Invalid metadata name' }
    }
    if (metadata.image !== approvedCollection.image) {
      return { valid: false, error: 'Invalid metadata image' }
    }
    if (metadata.description !== approvedCollection.description) {
      return { valid: false, error: 'Invalid metadata description' }
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metadata, collectionId, assetName, tokenId, walletAddress } = body as Record<string, unknown>

    // 入力検証
    if (!metadata || !collectionId || !assetName || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (typeof metadata !== 'object' || metadata === null) {
      return NextResponse.json(
        { error: 'Metadata must be an object' },
        { status: 400 }
      )
    }

    if (typeof collectionId !== 'string' || typeof assetName !== 'string' || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Invalid parameter types' },
        { status: 400 }
      )
    }

    const metadataRecord = metadata as MetadataRecord

    // メタデータの検証
    const validation = validateMetadata(metadataRecord, collectionId)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // タイムスタンプを追加（リプレイ攻撃防止）
    const timestamp = Date.now()
    
    // 検証済みメタデータの作成（CIP-25準拠のフィールドのみ）
    const verifiedMetadata: MetadataRecord = {
      name: metadataRecord.name,
      image: metadataRecord.image,
      mediaType: typeof metadataRecord.mediaType === 'string' ? metadataRecord.mediaType : 'image/jpg',
      description: metadataRecord.description,
    }

    if (Array.isArray(metadataRecord.attributes)) {
      verifiedMetadata.attributes = metadataRecord.attributes
    }
    
    // 検証情報は別オブジェクトとして管理
    const verificationInfo = {
      verified: true,
      verificationTimestamp: timestamp,
      verifiedBy: 'CardanoNFTVerificationAPI'
    }

    // メタデータハッシュの生成
    const metadataHash = generateMetadataHash(verifiedMetadata)
    
    // 署名データの作成
    const signatureData = JSON.stringify({
      metadataHash,
      assetName,
      tokenId,
      walletAddress,
      timestamp,
      collectionId
    })
    
    // 署名の生成
    const signature = generateSignature(signatureData, API_SECRET)

    // レスポンス
    return NextResponse.json({
      success: true,
      verifiedMetadata,  // CIP-25準拠のメタデータ
      verificationInfo,  // 検証情報（オンチェーンには含まれない）
      metadataHash,
      signature,
      timestamp,
      // 署名検証用の情報
      verificationData: {
        collectionId,
        assetName,
        tokenId,
        walletAddress,
        metadataHash,
        timestamp
      }
    })

  } catch (error) {
    console.error('Metadata verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 署名検証用のGETエンドポイント
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const signature = searchParams.get('signature')
  const metadataHash = searchParams.get('metadataHash')
  const timestamp = searchParams.get('timestamp')

  if (!signature || !metadataHash || !timestamp) {
    return NextResponse.json(
      { error: 'Missing verification parameters' },
      { status: 400 }
    )
  }

  // タイムスタンプの有効性チェック（24時間以内）
  const currentTime = Date.now()
  const signatureTime = parseInt(timestamp)
  if (currentTime - signatureTime > 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { valid: false, error: 'Signature expired' },
      { status: 400 }
    )
  }

  // ToDo: 実際の検証ロジックをここに実装


  return NextResponse.json({
    valid: true,
    metadataHash,
    timestamp
  })
}
