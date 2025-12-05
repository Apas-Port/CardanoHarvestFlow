import { getNetworkConfig } from './network-config';

// Blockfrost configuration
export function getBlockfrostConfig() {
  const config = getNetworkConfig();

  return {
    apiKey: config.blockfrostApiKey,
    baseUrl: config.blockfrostUrl,
    headers: {
      'project_id': config.blockfrostApiKey
    }
  };
}