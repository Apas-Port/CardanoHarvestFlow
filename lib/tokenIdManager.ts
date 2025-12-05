// Shared token ID management
// In production, this should be replaced with a database

// Track the highest token ID for each policy ID to ensure sequential numbering
const highestTokenIdByPolicy = new Map<string, number>();

export function getHighestTokenId(policyId: string): number {
  return highestTokenIdByPolicy.get(policyId) || 0;
}

export function setHighestTokenId(policyId: string, tokenId: number, options: { force?: boolean } = {}): void {
  const current = highestTokenIdByPolicy.get(policyId) || 0;
  if (options.force || tokenId > current) {
    highestTokenIdByPolicy.set(policyId, tokenId);
  }
}

export function getNextTokenId(policyId: string): number {
  const current = getHighestTokenId(policyId);
  const next = current + 1;
  setHighestTokenId(policyId, next);
  return next;
}

export function getAllTokenIds(): Map<string, number> {
  return new Map(highestTokenIdByPolicy);
}
