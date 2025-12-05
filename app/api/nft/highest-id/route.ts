import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for highest token ID (in production, use a database)
const highestTokenId: Record<string, number> = {
  'HARVEST_FLOW': 0
}

// Blockfrost configuration
const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY || 'preprodAiY1v9UkP4zd38drJ0fqZHBD5hPLZrQX'
const BLOCKFROST_URL = 'https://cardano-preprod.blockfrost.io/api/v0'

interface NFTAttribute {
  trait_type?: string
  value?: string | number
}

interface NFTAsset {
  unit: string
  quantity: string
  onchain_metadata?: {
    name?: string
    attributes?: NFTAttribute[]
    tokenId?: string
    serialNumber?: string
    [key: string]: unknown
  }
}

type BlockfrostAsset = {
  asset: string
} & Record<string, unknown>

type DetailedNFTAsset = NFTAsset & Record<string, unknown>

// Function to fetch NFTs from a specific policy ID
async function fetchNFTsFromPolicy(policyId: string): Promise<NFTAsset[]> {
  try {
    const response = await fetch(
      `${BLOCKFROST_URL}/assets/policy/${policyId}`,
      {
        headers: {
          'project_id': BLOCKFROST_API_KEY
        }
      }
    )

    if (!response.ok) {
      console.error('Blockfrost API error:', response.status)
      return []
    }

    const assets = await response.json() as BlockfrostAsset[]
    
    // Fetch detailed metadata for each asset
    const detailedAssets = await Promise.all(
      assets.map(async (asset) => {
        try {
          const metadataResponse = await fetch(
            `${BLOCKFROST_URL}/assets/${asset.asset}`,
            {
              headers: {
                'project_id': BLOCKFROST_API_KEY
              }
            }
          )
          
          if (metadataResponse.ok) {
            return await metadataResponse.json() as DetailedNFTAsset
          }
        } catch (error) {
          console.error('Error fetching asset metadata:', error)
        }
        return null
      })
    )

    return detailedAssets.filter((asset): asset is DetailedNFTAsset => Boolean(asset))
  } catch (error) {
    console.error('Error fetching NFTs from policy:', error)
    return []
  }
}

// Function to extract token ID from asset name
function extractTokenId(assetName: string): number {
  // Handle both old format (HF00001) and new format (Harvestflow#1 - no space)
  const oldFormatMatch = assetName.match(/^HF(\d+)$/)
  if (oldFormatMatch) {
    return parseInt(oldFormatMatch[1], 10)
  }
  
  // Updated pattern to match Harvestflow#123 (no space before #)
  const newFormatMatch = assetName.match(/^Harvestflow#(\d+)$/i)
  if (newFormatMatch) {
    return parseInt(newFormatMatch[1], 10)
  }
  
  // Also support legacy format with space for backward compatibility
  const legacyFormatMatch = assetName.match(/^Harvestflow\s+#(\d+)$/i)
  if (legacyFormatMatch) {
    return parseInt(legacyFormatMatch[1], 10)
  }
  
  return 0
}

// GET endpoint to fetch the highest token ID
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const collectionId = searchParams.get('collectionId') || 'HARVEST_FLOW'
    const policyId = searchParams.get('policyId')
    
    // If a policy ID is provided, fetch NFTs from blockchain
    if (policyId) {
      const nfts = await fetchNFTsFromPolicy(policyId)
      
      let maxId = 0
      console.log(`Found ${nfts.length} NFTs for policy ${policyId}`)
      
      nfts.forEach(nft => {
        // Try to extract token ID from asset name
        const assetName = nft.unit ? Buffer.from(nft.unit.slice(56), 'hex').toString('utf8') : ''
        const tokenId = extractTokenId(assetName)
        
        console.log('NFT analysis:', {
          unit: nft.unit,
          assetName,
          extractedTokenId: tokenId,
          metadata: nft.onchain_metadata
        })
        
        if (tokenId > maxId) {
          maxId = tokenId
        }
        
        // Also check metadata for token ID
        if (nft.onchain_metadata) {
          // Check attributes field
          if (Array.isArray(nft.onchain_metadata.attributes)) {
            const tokenIdAttr = nft.onchain_metadata.attributes.find(
              (attr) => attr?.trait_type === 'Token ID'
            )
            if (tokenIdAttr) {
              const rawValue = typeof tokenIdAttr.value === 'number'
                ? tokenIdAttr.value.toString()
                : tokenIdAttr.value
              const parsed = rawValue ? parseInt(rawValue, 10) : NaN
              if (!Number.isNaN(parsed) && parsed > maxId) {
                maxId = parsed
              }
            }
          }

          // Also check tokenId field directly
          if (nft.onchain_metadata.tokenId) {
            const parsedTokenId = parseInt(nft.onchain_metadata.tokenId, 10)
            if (!Number.isNaN(parsedTokenId) && parsedTokenId > maxId) {
              maxId = parsedTokenId
            }
          }

          // Check serialNumber field
          if (nft.onchain_metadata.serialNumber) {
            const parsedSerial = parseInt(nft.onchain_metadata.serialNumber, 10)
            if (!Number.isNaN(parsedSerial) && parsedSerial > maxId) {
              maxId = parsedSerial
            }
          }
        }
      })
      
      // Update in-memory storage if higher ID found
      if (maxId > highestTokenId[collectionId]) {
        highestTokenId[collectionId] = maxId
      }
    }
    
    return NextResponse.json({
      success: true,
      collectionId,
      highestTokenId: highestTokenId[collectionId] || 0,
      nextTokenId: (highestTokenId[collectionId] || 0) + 1
    })
    
  } catch (error) {
    console.error('Error getting highest token ID:', error)
    return NextResponse.json(
      { error: 'Failed to get highest token ID' },
      { status: 500 }
    )
  }
}

// POST endpoint to update the highest token ID after minting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { collectionId, tokenId } = body
    
    if (!collectionId || typeof tokenId !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    // Update highest token ID if new one is higher
    if (!highestTokenId[collectionId] || tokenId > highestTokenId[collectionId]) {
      highestTokenId[collectionId] = tokenId
    }
    
    return NextResponse.json({
      success: true,
      collectionId,
      highestTokenId: highestTokenId[collectionId]
    })
    
  } catch (error) {
    console.error('Error updating highest token ID:', error)
    return NextResponse.json(
      { error: 'Failed to update highest token ID' },
      { status: 500 }
    )
  }
}
