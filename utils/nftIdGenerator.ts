// NFT ID生成ユーティリティ
// 本番環境では、これらのIDはデータベースで管理する必要があります

interface NFTIdConfig {
  collectionPrefix: string
  startId?: number
  padLength?: number
}

export class NFTIdGenerator {
  private static counters: Map<string, number> = new Map()

  /**
   * 連番のIDを生成
   */
  static generateSequentialId(config: NFTIdConfig): {
    tokenId: number
    assetName: string
  } {
    const { collectionPrefix, startId = 1 } = config
    
    // 現在のカウンターを取得（なければstartIdから開始）
    const currentId = this.counters.get(collectionPrefix) || startId
    const nextId = currentId + 1
    
    // 次回のために保存
    this.counters.set(collectionPrefix, nextId)
    
    // New format: HARVESTFLOW#1 (no padding)
    const assetName = `${collectionPrefix}#${nextId}`
    
    return {
      tokenId: nextId,
      assetName
    }
  }

  /**
   * タイムスタンプベースのユニークID生成
   */
  static generateTimestampId(collectionPrefix: string): {
    tokenId: string
    assetName: string
  } {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const tokenId = `${timestamp}${random}`
    const assetName = `${collectionPrefix}${tokenId}`
    
    return {
      tokenId,
      assetName
    }
  }

  /**
   * UUID v4ベースのID生成
   */
  static generateUuidId(collectionPrefix: string): {
    tokenId: string
    assetName: string
  } {
    // 簡易的なUUID v4生成
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    
    // CardanoのassetNameは32バイト制限があるので短縮
    const shortUuid = uuid.replace(/-/g, '').substring(0, 16)
    const assetName = `${collectionPrefix}${shortUuid}`
    
    return {
      tokenId: uuid,
      assetName
    }
  }

  /**
   * 現在のカウンターをリセット
   */
  static resetCounter(collectionPrefix: string): void {
    this.counters.delete(collectionPrefix)
  }

  /**
   * 全てのカウンターをリセット
   */
  static resetAllCounters(): void {
    this.counters.clear()
  }

  /**
   * 特定のコレクションの現在のカウンター値を取得
   */
  static getCurrentId(collectionPrefix: string): number | undefined {
    return this.counters.get(collectionPrefix)
  }
}

// エクスポート用のヘルパー関数
export const generateNFTId = {
  sequential: (prefix: string, startId?: number) => 
    NFTIdGenerator.generateSequentialId({ 
      collectionPrefix: prefix, 
      startId 
    }),
  
  timestamp: (prefix: string) => 
    NFTIdGenerator.generateTimestampId(prefix),
  
  uuid: (prefix: string) => 
    NFTIdGenerator.generateUuidId(prefix)
}