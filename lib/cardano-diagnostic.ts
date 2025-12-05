import { BrowserWallet } from '@meshsdk/core';

export async function runCardanoDiagnostics(walletName: string): Promise<{
  wallet: any;
  network: any;
  address: any;
  utxos: any;
  balance: any;
  collateral: any;
  protocolParams: any;
}> {
  try {
    console.log('=== Starting Cardano Wallet Diagnostics ===');
    console.log('Wallet name:', walletName);
    
    // Enable wallet
    const wallet = await BrowserWallet.enable(walletName);
    console.log('Wallet enabled successfully');
    
    // Get basic info
    const results: any = {
      wallet: { enabled: true, name: walletName }
    };
    
    // Network info
    try {
      const networkId = await wallet.getNetworkId();
      results.network = {
        id: networkId,
        name: networkId === 0 ? 'testnet' : 'mainnet'
      };
      console.log('Network:', results.network);
    } catch (e) {
      console.error('Failed to get network:', e);
      results.network = { error: e instanceof Error ? e.message : 'Failed' };
    }
    
    // Address info
    try {
      const changeAddress = await wallet.getChangeAddress();
      const usedAddresses = await wallet.getUsedAddresses();
      const unusedAddresses = await wallet.getUnusedAddresses();
      
      results.address = {
        change: changeAddress,
        used: usedAddresses.length,
        unused: unusedAddresses.length,
        firstUsed: usedAddresses[0],
        firstUnused: unusedAddresses[0]
      };
      console.log('Addresses:', results.address);
    } catch (e) {
      console.error('Failed to get addresses:', e);
      results.address = { error: e instanceof Error ? e.message : 'Failed' };
    }
    
    // UTXOs
    try {
      const utxos = await wallet.getUtxos();
      results.utxos = {
        count: utxos.length,
        first: utxos[0],
        total: utxos.length > 0 ? utxos.map((u: any) => {
          try {
            const lovelace = u.output?.amount?.find((a: any) => a.unit === 'lovelace');
            return parseInt(lovelace?.quantity || '0');
          } catch {
            return 0;
          }
        }).reduce((a: number, b: number) => a + b, 0) : 0
      };
      console.log('UTXOs:', results.utxos);
    } catch (e) {
      console.error('Failed to get UTXOs:', e);
      results.utxos = { error: e instanceof Error ? e.message : 'Failed' };
    }
    
    // Balance
    try {
      const lovelace = await wallet.getLovelace();
      results.balance = {
        lovelace: lovelace,
        ada: parseInt(lovelace) / 1_000_000
      };
      console.log('Balance:', results.balance);
    } catch (e) {
      console.error('Failed to get balance:', e);
      results.balance = { error: e instanceof Error ? e.message : 'Failed' };
    }
    
    // Collateral
    try {
      const collateral = await wallet.getCollateral();
      results.collateral = {
        count: collateral.length,
        first: collateral[0]
      };
      console.log('Collateral:', results.collateral);
    } catch (e) {
      console.error('Failed to get collateral:', e);
      results.collateral = { error: e instanceof Error ? e.message : 'Failed' };
    }
    
    // Check if we can get protocol parameters (important for tx building)
    try {
      // Try to get from wallet API if available
      if ('getProtocolParameters' in wallet && typeof wallet.getProtocolParameters === 'function') {
        const params = await wallet.getProtocolParameters();
        results.protocolParams = { available: true, params };
      } else {
        results.protocolParams = { available: false, note: 'Method not available' };
      }
    } catch (e) {
      console.error('Failed to get protocol params:', e);
      results.protocolParams = { error: e instanceof Error ? e.message : 'Failed' };
    }
    
    console.log('=== Diagnostics Complete ===');
    console.log('Results:', JSON.stringify(results, null, 2));
    
    return results;
  } catch (error) {
    console.error('Diagnostic error:', error);
    throw error;
  }
}