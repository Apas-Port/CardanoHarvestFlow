import { setHighestTokenId } from './tokenIdManager';
import { fetchMintedCount } from './fetch-minted-count';

// Sync token ID manager with blockchain data
export async function syncTokenIdWithBlockchain(policyId: string): Promise<void> {
  try {
    console.log(`Syncing token ID for policy ${policyId} with blockchain...`);
    
    // Fetch the actual minted count from blockchain
    const mintedCount = await fetchMintedCount(policyId);
    
    if (mintedCount > 0) {
      // Update the token ID manager with the blockchain data
      setHighestTokenId(policyId, mintedCount, { force: true });
      console.log(`Token ID synced for policy ${policyId}: highest ID is ${mintedCount}`);
    } else {
      console.log(`No NFTs found for policy ${policyId}`);
    }
  } catch (error) {
    console.error('Error syncing token ID with blockchain:', error);
    // Don't throw - allow the application to continue with in-memory state
  }
}
