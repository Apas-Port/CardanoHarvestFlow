type RequestSource = Request | URL | string | null | undefined;

function extractUrlFromSource(source: RequestSource): URL | null {
  if (!source) {
    return null;
  }

  try {
    if (source instanceof URL) {
      return source;
    }

    if (typeof source === 'string') {
      return new URL(source);
    }

    if (typeof source === 'object') {
      const requestLike = source as Request & { nextUrl?: { href?: string } };

      if (requestLike.nextUrl && typeof requestLike.nextUrl.href === 'string') {
        return new URL(requestLike.nextUrl.href);
      }

      if (typeof requestLike.url === 'string') {
        return new URL(requestLike.url);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function resolveBaseUrlCandidate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveAppBaseUrl(): string | null {
  const candidates = [
    resolveBaseUrlCandidate(process.env.NEXT_PUBLIC_BASE_URL),
    resolveBaseUrlCandidate(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null
    ),
    resolveBaseUrlCandidate(process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null
    ),
  ];

  const match = candidates.find((candidate): candidate is string => Boolean(candidate));
  return match ?? null;
}

function isVercelDomain(url: string | null): boolean {
  if (!url) {
    return false;
  }

  return url.toLowerCase().includes('vercel');
}

export type SupportedNetwork = 'mainnet' | 'preprod';

function normalizeNetwork(value?: string | null): SupportedNetwork | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'mainnet') {
    return 'mainnet';
  }

  if (['preprod', 'preview', 'develop', 'development', 'staging'].includes(normalized)) {
    return 'preprod';
  }

  return null;
}

export interface NetworkConfig {
  network: SupportedNetwork;
  isMainnet: boolean;
  isTestnet: boolean;
  treasuryAddress: string;
  policyId: string;
  explorerUrl: string;
  blockfrostUrl: string;
  koiosUrl: string;
}

export interface ServerNetworkConfig extends NetworkConfig {
  blockfrostApiKey: string;
}

/**
 * Get network configuration for SERVER-SIDE use only
 * Includes sensitive API keys - DO NOT use in client components
 */
export function getServerNetworkConfig(source?: Request | URL | string): ServerNetworkConfig {
  const explicitNetwork = normalizeNetwork(process.env.NEXT_PUBLIC_CARDANO_NETWORK);
  const shouldForceMainnet = process.env.VERCEL_ENV === 'production' || process.env.VERCEL === '1';

  // Check for ?dev URL parameter (client-side only)
  let isDevMode = false;

  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    isDevMode = searchParams.has('dev');
  }

  if (!isDevMode) {
    // Server-side: inspect request URL when available
    const url = extractUrlFromSource(source);
    if (url) {
      isDevMode = url.searchParams.has('dev');
    }
  }

  if (isDevMode) {
    console.log('[network-config] ?dev parameter detected, forcing preprod network');
  }

  const network: SupportedNetwork = isDevMode
    ? 'preprod'
    : (explicitNetwork ?? (shouldForceMainnet ? 'mainnet' : 'preprod'));
  const isMainnet = network === 'mainnet';

  return {
    network,
    isMainnet,
    isTestnet: !isMainnet,
    // SERVER-SIDE ONLY: Blockfrost API key (no NEXT_PUBLIC_ prefix)
    blockfrostApiKey: isMainnet
      ? (process.env.BLOCKFROST_MAINNET_API_KEY || process.env.BLOCKFROST_MAINNET_PROJECT_ID || '')
      : (process.env.BLOCKFROST_API_KEY || process.env.BLOCKFROST_PROJECT_ID || ''),
    treasuryAddress: isMainnet
      ? (process.env.NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS || 'addr1q887g4a5jsg57ul36vnnn99aqddgkesawvgzjlshsxyhpxjngs2np8tlavv9w6xnz58snl0czq3ywsapt9dkqxpx738sgp968m')
      : (process.env.NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS || 'addr_test1qr87g4a5jsg57ul36vnnn99aqddgkesawvgzjlshsxyhpxjngs2np8tlavv9w6xnz58snl0czq3ywsapt9dkqxpx738sthc6ty'),
    policyId: process.env.HARVESTFLOW_POLICY_ID || '5b1a3dc00d40b402a72f72b9a5f0c1197e9ddc50a7366a68d719e653',
    explorerUrl: isMainnet
      ? 'https://cardanoscan.io'
      : 'https://preprod.cexplorer.io',
    blockfrostUrl: isMainnet
      ? 'https://cardano-mainnet.blockfrost.io/api/v0/'
      : 'https://cardano-preprod.blockfrost.io/api/v0/',
    koiosUrl: isMainnet
      ? 'https://api.koios.rest/api/v0'
      : 'https://preprod.koios.rest/api/v0'
  };
}

/**
 * Get network configuration for CLIENT-SIDE use
 * Does NOT include sensitive API keys
 * For client components, use ProxiedBlockfrostProvider instead of direct API access
 *
 * URL parameter ?dev forces preprod network
 */
export function getClientNetworkConfig(): NetworkConfig {
  const explicitNetwork = normalizeNetwork(process.env.NEXT_PUBLIC_CARDANO_NETWORK);

  // Check for ?dev URL parameter (client-side only)
  let isDevMode = false;
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    isDevMode = searchParams.has('dev');
    if (isDevMode) {
      console.log('[network-config] ?dev parameter detected, forcing preprod network');
    }
  }

  // URL parameter ?dev forces preprod, otherwise use explicit network or default to preprod
  const network: SupportedNetwork = isDevMode ? 'preprod' : (explicitNetwork ?? 'preprod');
  const isMainnet = network === 'mainnet';

  return {
    network,
    isMainnet,
    isTestnet: !isMainnet,
    treasuryAddress: isMainnet
      ? (process.env.NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS || 'invalid')
      : (process.env.NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS || 'invalid'),
    policyId: process.env.HARVESTFLOW_POLICY_ID || '5b1a3dc00d40b402a72f72b9a5f0c1197e9ddc50a7366a68d719e653',
    explorerUrl: isMainnet
      ? 'https://cardanoscan.io'
      : 'https://preprod.cexplorer.io',
    blockfrostUrl: isMainnet
      ? 'https://cardano-mainnet.blockfrost.io/api/v0/'
      : 'https://cardano-preprod.blockfrost.io/api/v0/',
    koiosUrl: isMainnet
      ? 'https://api.koios.rest/api/v0'
      : 'https://preprod.koios.rest/api/v0'
  };
}

/**
 * @deprecated Use getServerNetworkConfig() for server-side or getClientNetworkConfig() for client-side
 * This function is kept for backward compatibility but will be removed in the future
 */
export function getNetworkConfig(source?: Request | URL | string) {
  // Detect if we're on server or client
  const isServer = typeof window === 'undefined';

  if (isServer) {
    return getServerNetworkConfig(source);
  } else {
    // On client, return config without API key
    // Cast to match old return type for compatibility
    return getClientNetworkConfig() as ServerNetworkConfig & { blockfrostApiKey: '' };
  }
}

export function getNetworkName(): 'Mainnet' | 'Preprod' {
  const { isMainnet } = getNetworkConfig();
  return isMainnet ? 'Mainnet' : 'Preprod';
}
