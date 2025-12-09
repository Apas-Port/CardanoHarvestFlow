import { fetchMintedCount } from "./fetch-minted-count";
import mainnetProjectsJson from '../public/data/projects.json';
import devProjectsJson from '../public/data/dev-projects.json';
import { Network } from "./network";
import { getServerNetworkConfig, getClientNetworkConfig } from "./network-config";

export interface Project {
  id: string;
  status: string;
  num: number;
  title: string;
  subTitle: string;
  description: string;

  contractAddress: `0x${string}`;

  apy: number;
  capacity: number;  // 総販売個数
  unitPrice: number; // 販売価格
  displayUnitPrice?: number; // 表示用価格 (USD等)
  displayCurrency?: string;
  displayRaisedAmount?: number;
  displayTotalAmount?: number;
  raisedAmount: number; // 現在調達金額
  totalAmount: number; // 目標調達金額
  collectionName?: string;
  maxMints?: number;
  paramUtxoEnvKey?: string;
  mintPriceLovelace?: number;

  mainImage: string;
  previewImage: string;
  tuktukImage: string;

  interestEarned: string;
  interestRate: number;
  repaymentMethod: string;
  lendingPeriod: number;
  startDate: string;

  mintedAmount: number;
  listing: boolean;

  // Additional fields from JSON
  lendingType: string;
  network: Network;
  policyId?: string;
  legacyPolicyIds?: string[];
  assetId?: string[];

  // Milestone progress tracking
  milestones?: number[];
  unitSupportTarget?: {
    label: string;
    unitCost: number;
  };

  // NFT Metadata (for minting)
  metadata?: {
    name?: string;
    image?: string;
    description?: string;
    mediaType?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    [key: string]: unknown;
  };
}

let cachedProjects: Project[] | null = null;
let cachedIsMainnet: boolean | null = null;

export const matchNFTContractAddressWithProjects = async (contractAddress: string, source?: Request | URL | string): Promise<Project | null> => {
  // Always call getProjectData to handle cache invalidation
  const projects = await getProjectData(source);

  const project = projects.find(
    p => p.contractAddress && p.contractAddress.toLowerCase() === contractAddress.toLowerCase()
  );

  return project || null;
};

export const matchNFTPolicyIdWithProjects = async (policyId: string, source?: Request | URL | string): Promise<Project | null> => {
  // Always call getProjectData to handle cache invalidation
  const projects = await getProjectData(source);

  const normalizedPolicyId = policyId.toLowerCase();

  const project = projects.find((p) => {
    if (p.policyId && p.policyId.toLowerCase() === normalizedPolicyId) {
      return true;
    }

    if (Array.isArray(p.legacyPolicyIds)) {
      return p.legacyPolicyIds.some((legacyId) => legacyId?.toLowerCase() === normalizedPolicyId);
    }

    return false;
  });

  return project || null;
};

export const getProjectById = async (projectId: string, source?: Request | URL | string): Promise<Project | null> => {
  // Always call getProjectData to handle cache invalidation
  const projects = await getProjectData(source);

  const project = projects.find(
    p => p.id && p.id.toLowerCase() === projectId.toLowerCase()
  );

  return project || null;
};

export const getProjectData = async (source?: Request | URL | string): Promise<Project[]> => {
  try {
    // Determine which network config function to use
    const isServer = typeof window === 'undefined';
    const { isMainnet } = isServer ? getServerNetworkConfig(source) : getClientNetworkConfig();
    const shouldUseMainnet = isMainnet;
    const bypassCache = process.env.NODE_ENV !== 'production';

    console.log('[project] shouldUseMainnet:', shouldUseMainnet, 'isServer:', isServer);

    // Clear cache if network changed (e.g., ?dev parameter added/removed)
    if (cachedIsMainnet !== null && cachedIsMainnet !== shouldUseMainnet) {
      console.log('[project] Network changed, clearing cache');
      cachedProjects = null;
      cachedIsMainnet = null;
    }

    if (bypassCache) {
      cachedProjects = null;
      cachedIsMainnet = null;
    }

    // Return cached projects if available and network hasn't changed
    if (!bypassCache && cachedProjects !== null && cachedIsMainnet === shouldUseMainnet) {
      console.log('[project] Returning cached projects');
      return cachedProjects;
    }

    // Local (dev/preprod) uses dev-projects.json
    // Production (mainnet) uses projects.json
    // URL parameter ?dev forces dev-projects.json on client side
    const projectsFile = shouldUseMainnet ? "projects.json" : "dev-projects.json";
    console.log('[project] Using projects file:', projectsFile);

    let projects: Project[] | undefined;

    if (isServer) {
      if (bypassCache) {
        try {
          const pathMod = await import(/* webpackIgnore: true */ 'node:path');
          const fsPromises = await import(/* webpackIgnore: true */ 'node:fs/promises');
          const filePath = pathMod.join(process.cwd(), 'public', 'data', projectsFile);
          const fileContent = await fsPromises.readFile(filePath, 'utf8');
          projects = JSON.parse(fileContent) as Project[];
        } catch (error) {
          console.error('[project] Failed to read projects file from disk, falling back to bundled JSON', error);
        }
      }

      if (!projects) {
        const sourceData = shouldUseMainnet ? mainnetProjectsJson : devProjectsJson;
        projects = JSON.parse(JSON.stringify(sourceData)) as Project[];
      }
    } else {
      const response = await fetch(`/data/${projectsFile}`, {
        cache: bypassCache ? 'no-store' : 'force-cache',
      });

      if (!response.ok) {
        console.error('Failed to fetch projects data:', response.status, response.statusText);
        throw new Error(`Failed to fetch projects data: ${response.status}`);
      }

      projects = await response.json() as Project[];
    }

    if (!projects) {
      console.error('[project] No project data available after loading');
      return [];
    }

    // Enhanced projects with static data
    const enhancedProjects = await Promise.all(
      projects.map(async (p) => {
        // Get minted count from both new and legacy policy IDs
        let mintedCount = 0;
        
        const policyCandidates = [
          p.policyId,
          ...(Array.isArray(p.legacyPolicyIds) ? p.legacyPolicyIds : []),
        ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

        const uniquePolicies = [...new Set(policyCandidates.map((value) => value.toLowerCase()))];

        for (const policy of uniquePolicies) {
          try {
            const count = await fetchMintedCount(policy);
            mintedCount += count;
            if (count > 0) {
              console.log(`Found ${count} NFTs with policy ${policy}`);
            }
          } catch (error) {
            console.error(`Failed to fetch minted count for policy ${policy}:`, error);
          }
        }
        
        const mintPriceValue = typeof p.mintPriceLovelace === 'number' ? Number(p.mintPriceLovelace) : undefined;
        const normalizedUnitPrice = mintPriceValue && Number.isFinite(mintPriceValue)
          ? mintPriceValue / 1_000_000
          : p.unitPrice;

        const displayUnitPrice = (mintPriceValue && Number.isFinite(mintPriceValue)) ? p.unitPrice : undefined;

        const displayTotalAmount = displayUnitPrice !== undefined ? p.capacity * displayUnitPrice : undefined;
        const displayRaisedAmount = displayUnitPrice !== undefined ? mintedCount * displayUnitPrice : undefined;

        const enhanced = {
          ...p,
          unitPrice: normalizedUnitPrice,
          displayUnitPrice,
          displayCurrency: p.lendingType,
          displayRaisedAmount,
          displayTotalAmount,
          mintedAmount: mintedCount,
          totalAmount: p.capacity * normalizedUnitPrice,
          raisedAmount: mintedCount * normalizedUnitPrice,
          collectionName: p.collectionName ?? p.title,
          maxMints: p.maxMints,
          paramUtxoEnvKey: p.paramUtxoEnvKey,
          mintPriceLovelace: p.mintPriceLovelace,
        };
        
        return enhanced;
      })
    );

    // Update cache
    if (!bypassCache) {
      cachedProjects = enhancedProjects;
      cachedIsMainnet = shouldUseMainnet;
      console.log('[project] Cached projects updated');
    }

    return enhancedProjects;
  } catch (error) {
    console.error('Error loading items data:', error);
    return [];
  }
};
