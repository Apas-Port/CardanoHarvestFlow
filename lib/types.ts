import { Project } from "./project";

// Common request status types
export type RequestStatus = 'idle' | 'submitting' | 'success' | 'error';
export type NftRequestStatus = 'in_review' | 'in_progress' | 'completed' | 'expired';
export type WorkshopStatus = 'idle' | 'marking' | 'creating' | 'success' | 'error';

// NFT request data types
export type CreateNftRequestData = {
  userAddress: string;
  nftContractAddress: string;
  nftTokenId: string;
  openseaUrl: string;
  nftImageUrl: string;
  status?: NftRequestStatus;
  prefersSquare?: boolean;
  prefersCircular?: boolean;
  prefersBackground?: boolean;
  prefersNoBackground?: boolean;
  prefersUnspecified?: boolean;
};

export type NftRequestData = CreateNftRequestData & {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedImages?: CompletedImageData[];
};

// Completed image data types
export type CompletedImageData = {
  requestId: string;
  url: string;
  isThumbnail?: boolean;
  id?: string;
  created_at?: string;
};

// Workshop data type
export type WorkshopData = {
  userAddress: string;
  nftContractAddress: string;
  tokenId: number;
  openseaUrl: string;
  nftImageUrl: string;
  prefersSquare?: boolean;
  prefersCircular?: boolean;
  prefersBackground?: boolean;
  prefersNoBackground?: boolean;
  prefersUnspecified?: boolean;
};

// Type definition for NFT data from The Graph (based on useUserNfts.ts)
export interface NftToken {
  id: string; // The Graph node ID (e.g., "0xcontract-0xtokenid")
  tokenId: string;
  tokenURI: string | null;
}

// Basic NFT Metadata structure (can be expanded)
export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: { trait_type: string; value: string | number }[];
  animation_url?: string;
  external_url?: string;
  // Add other common fields as needed
}

// Type definition for combined NFT data (on-chain + DB)
export interface CombinedNftData extends NftToken {
  status: NftRequestStatus | 'on-chain'; // Status from DB or default 'on-chain'
  metadata?: NftMetadata; // Decoded metadata from tokenURI
  dbRequestId?: string; // Original DB request ID if matched
  openseaUrl?: string; // OpenSea URL from DB if matched
  nftImageUrl? :string; // OpenSea NFT URL from DB if matched
  projectNamespace?: 'dour-darcels-wrap' | 'nft-decal'; // Project namespace for translations
}

// Type definition for the response from the hasTokenId API
export type HasTokenIdsResponse = Record<string, number[]>;

export interface TokenEvent {
  id: number;
  wallet_address: string;
  project_id: string;
  token_ids: string[];
  amount: number;
  payable: string;
  event: string;
  created_at: string;
  tx_hash: string;
  project: Project;
}

// Type definition for RWA Asset data
export interface RwaAsset {
  no: number; // Added missing property
  assetId: number;
  assetType: string;
  deviceId: number; // Added missing property
  status: string; // Added missing property
  carModel: string; // Added missing property
  color: string; // Added missing property
  year: number; // Added missing property
  vehiclePrice: number | string; // Added missing property
  customerName: string; // Added missing property
  sex: string; // Added missing property
  living: string; // Added missing property
  releaseDate: string; // Added missing property
  totalNumberOfPayments: number | string; // Added missing property
  numberOfPaymentsMade: number | string; // Added missing property
  history: string; // Added missing property
  name: string;
  description: string;
  image: string;
  assetImage: string;
  apr: string;
  mileageTime: string;
  driverName: string;
  driverSex: string;
  driverSince: string;
  driverLocation: string;
  accessUrlParams: string;
  // Add other properties as needed based on the actual data structure
}

export interface RepaymentHistory {
  status: boolean,
  project: string,
  numberOfRepayment: string,
  date: string,
  amount: number,
  unit: string,
}
