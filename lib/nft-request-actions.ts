'use server';

import { NftRequestData, CompletedImageData, NftRequestStatus, CreateNftRequestData } from './types';

/**
 * Mock implementation - Creates a new NFT request
 */
export async function createNftRequest(data: CreateNftRequestData): Promise<{ id: string } | null> {
  console.log('Mock createNftRequest', data);
  return { id: 'mock-id-' + Date.now() };
}

/**
 * Mock implementation - Gets an NFT request by ID
 */
export async function getNftRequest(id: string): Promise<NftRequestData | null> {
  console.log('Mock getNftRequest', id);
  return null;
}

/**
 * Mock implementation - Gets all NFT requests for a user
 */
export async function getUserNftRequests(userAddress: string): Promise<NftRequestData[]> {
  console.log('Mock getUserNftRequests', userAddress);
  return [];
}

/**
 * Mock implementation - Updates an NFT request status
 */
export async function updateNftRequestStatus(id: string, status: NftRequestStatus): Promise<boolean> {
  console.log('Mock updateNftRequestStatus', id, status);
  return true;
}

/**
 * Mock implementation - Marks an NFT request for a specific token
 */
export async function markNftRequestForToken(
  tokenAddress: string,
  tokenId: string
): Promise<{ id: string; status: NftRequestStatus } | null> {
  console.log('Mock markNftRequestForToken', tokenAddress, tokenId);
  return null;
}

/**
 * Mock implementation - Gets NFT request by contract and token ID
 */
export async function getNftRequestByToken(
  contractAddress: string,
  tokenId: string
): Promise<NftRequestData | null> {
  console.log('Mock getNftRequestByToken', contractAddress, tokenId);
  return null;
}

/**
 * Mock implementation - Gets completed images for an NFT request
 */
export async function getCompletedImages(requestId: string): Promise<CompletedImageData[]> {
  console.log('Mock getCompletedImages', requestId);
  return [];
}

/**
 * Mock implementation - Bulk creates NFT requests
 */
export async function bulkCreateNftRequests(requests: CreateNftRequestData[]): Promise<{ created: number; failed: number }> {
  console.log('Mock bulkCreateNftRequests', requests.length);
  return { created: requests.length, failed: 0 };
}