// Define IPFS gateway options
const IPFS_GATEWAYS = {
  primary: 'https://ipfs.io/ipfs/',
  fallback: 'https://gateway.ipfs.io/ipfs/'
};

// Define Irys gateway base URL
const IRYS_GATEWAY_BASE = 'https://gateway.irys.xyz/';

/**
 * Interfaces for NFT metadata
 */
export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  image_url?: string;
  image_data?: string;
  animation_url?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  [key: string]: unknown;
}

/**
 * Converts an IPFS URL to a gateway URL
 * 
 * @param url The URL that might be an IPFS URL
 * @param gateway Optional gateway to use (defaults to primary gateway)
 * @returns A URL that can be fetched via HTTP
 */
export function normalizeIpfsUrl(url: string, gateway?: string): string {
  if (!url) return url;
  
  const gatewayUrl = gateway || IPFS_GATEWAYS.primary;
  
  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://ipfs/')) {
    return `${gatewayUrl}${url.replace('ipfs://ipfs/', '')}`;
  }
  
  if (url.startsWith('ipfs://')) {
    return `${gatewayUrl}${url.replace('ipfs://', '')}`;
  }
  
  // Handle ipfs hash format
  if (url.match(/^Qm[1-9A-Za-z]{44}/) && !url.includes('/')) {
    return `${gatewayUrl}${url}`;
  }
  
  return url;
}

/**
 * Normalizes image URLs in NFT metadata
 * 
 * @param metadata The NFT metadata object
 * @returns The normalized image URL or null if not found
 */
export function extractImageUrl(metadata: NftMetadata | null): string | null {
  if (!metadata) return null;
  
  // Find the image URL from various possible metadata fields
  const imageUrl = metadata.image || 
                  metadata.image_url || 
                  metadata.image_data || 
                  null;
  
  if (!imageUrl) return null;
  
  // Normalize IPFS URLs
  return normalizeIpfsUrl(String(imageUrl));
}

/**
 * Safely attempt to parse JSON data
 * 
 * @param jsonString The string to parse as JSON
 * @returns The parsed object or null if parsing failed
 */
export function safeJsonParse<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Decode base64 encoded JSON data
 * 
 * @param base64Data The base64 encoded data
 * @param isServer Whether the code is running on the server
 * @returns The decoded data as an object or null if decoding failed
 */
export function decodeBase64Json<T>(base64Data: string, isServer = typeof window === 'undefined'): T | null {
  try {
    const jsonString = isServer
      ? Buffer.from(base64Data, 'base64').toString()
      : atob(base64Data);
    
    return safeJsonParse<T>(jsonString);
  } catch (error) {
    console.error('Failed to decode base64 data:', error);
    return null;
  }
}

/**
 * Fetches JSON metadata from Irys gateway for Polygon tokens
 * 
 * @param tokenId The token ID to fetch metadata for
 * @param irysId The Irys transaction ID (defaults to TfPczcpKc70n9fBzOIn8zEYxBG_ucquYhjN2UpW91uo)
 * @returns The metadata object or null if fetching failed
 */
export async function fetchIrysMetadata(tokenId: number | string, irysId: string = 'TfPczcpKc70n9fBzOIn8zEYxBG_ucquYhjN2UpW91uo'): Promise<NftMetadata | null> {
  const url = `${IRYS_GATEWAY_BASE}${irysId}/${tokenId}`;
  try {
    console.log(url)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch Irys metadata: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Normalize image URL if present
    if (data.image) {
      data.image = normalizeIpfsUrl(data.image);
    }
    
    return data as NftMetadata;
  } catch (error) {
    console.error('Error fetching Irys metadata:', error, url);
    return null;
  }
}

/**
 * Builds Irys gateway URL for a given token ID
 * 
 * @param tokenId The token ID
 * @param irysId The Irys transaction ID (defaults to TfPczcpKc70n9fBzOIn8zEYxBG_ucquYhjN2UpW91uo)
 * @returns The complete Irys gateway URL
 */
export function buildIrysUrl(tokenId: number | string, irysId: string = 'TfPczcpKc70n9fBzOIn8zEYxBG_ucquYhjN2UpW91uo'): string {
  return `${IRYS_GATEWAY_BASE}${irysId}/${tokenId}`;
}
