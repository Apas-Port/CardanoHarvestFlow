import { getNetworkConfig } from './network-config';

// Fetch minted count using Koios API (free alternative to Blockfrost)
export async function fetchMintedCountKoios(policyId: string, source?: Request | URL | string): Promise<number> {
  try {
    const { koiosUrl } = getNetworkConfig(source);
    
    console.log(`Fetching assets for policy ${policyId} from Koios ${koiosUrl}`);
    
    // Koios API requires POST request with policy_id in the body
    const response = await fetch(
      `${koiosUrl}/policy_asset_list`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _policy_ids: [policyId]
        })
      }
    );

    if (!response.ok) {
      console.error('Koios API error:', response.status);
      return 0;
    }

    const assets = await response.json();
    console.log(`Found ${assets.length} assets for policy ${policyId}`);
    
    let maxId = 0;
    
    console.log(`Assets: ${assets}`);
    // Extract token IDs from asset names
    for (const asset of assets) {
    console.log(`Asset`, asset);
      if (asset.asset_name) {
        try {
          // Decode hex asset name
          const assetName = Buffer.from(asset.asset_name, 'hex').toString('utf8');
          console.log(`Asset name: ${assetName}`);
          // Extract token ID
          const match = assetName.match(/(?:Harvestflow\s*#|HF)(\d+)/i);
          if (match) {
            const tokenId = parseInt(match[1], 10);
            console.log(`Asset: ${assetName}, Token ID: ${tokenId}`);
            
            if (tokenId > maxId) {
              maxId = tokenId;
            }
          }
        } catch (error) {
          console.error('Error parsing asset:', error);
        }
      }
    }
    
    console.log(`Highest token ID for policy ${policyId}: ${maxId}`);
    return maxId;
  } catch (error) {
    console.error('Error fetching minted count from Koios:', error);
    return 0;
  }
}
