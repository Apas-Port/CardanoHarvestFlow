import { BlockfrostProvider } from '@meshsdk/core';
import type { BlockInfo, Protocol, TransactionInfo, UTxO } from '@meshsdk/common';
import { appendDevQuery } from './dev-mode';

/**
 * Proxied Blockfrost Provider
 *
 * This provider wraps BlockfrostProvider and routes requests through our proxy
 * to avoid CORS issues when building transactions client-side.
 *
 * All API calls go through /api/cardano/blockfrost-proxy instead of directly to Blockfrost.
 * This means the API key is kept server-side and never exposed to the client.
 */
export class ProxiedBlockfrostProvider extends BlockfrostProvider {
  private proxyEndpoint: string;

  /**
   * @param networkId - Network ID (0 for preprod/testnet, 1 for mainnet)
   * @param projectId - Optional project ID (not used as all requests go through proxy, but required by parent class)
   */
  constructor(networkId: 0 | 1, projectId?: string) {
    // Pass a dummy project ID to parent class since we don't use it
    // All requests go through our BFF proxy which handles authentication
    super(projectId || 'proxy-mode', networkId);
    this.proxyEndpoint = appendDevQuery('/api/cardano/blockfrost-proxy');
  }

  /**
   * Override fetchAddressUTxOs to use proxy
   */
  async fetchAddressUTxOs(address: string, asset?: string): Promise<UTxO[]> {
    const endpoint = asset
      ? `/addresses/${address}/utxos/${asset}`
      : `/addresses/${address}/utxos`;

    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method: 'GET' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch address UTxOs: ${response.statusText}`);
    }

    const utxos = await response.json();

    // Convert Blockfrost format to MeshSDK UTxO format
    return utxos.map((utxo: any) => ({
      input: {
        outputIndex: utxo.output_index,
        txHash: utxo.tx_hash,
      },
      output: {
        address: utxo.address,
        amount: utxo.amount.map((a: any) => ({
          unit: a.unit,
          quantity: a.quantity,
        })),
        dataHash: utxo.data_hash || undefined,
        plutusData: utxo.inline_datum || undefined,
        scriptRef: utxo.reference_script_hash || undefined,
      },
    }));
  }

  /**
   * Override fetchTxInfo to use proxy
   */
  async fetchTxInfo(txHash: string): Promise<TransactionInfo> {
    const endpoint = `/txs/${txHash}`;

    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method: 'GET' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tx info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Override fetchUTxOs to use proxy
   */
  async fetchUTxOs(txHash: string): Promise<UTxO[]> {
    const endpoint = `/txs/${txHash}/utxos`;

    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method: 'GET' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch UTxOs: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert Blockfrost format to MeshSDK UTxO format
    return data.outputs.map((output: any, index: number) => ({
      input: {
        outputIndex: index,
        txHash: txHash,
      },
      output: {
        address: output.address,
        amount: output.amount.map((a: any) => ({
          unit: a.unit,
          quantity: a.quantity,
        })),
        dataHash: output.data_hash || undefined,
        plutusData: output.inline_datum || undefined,
        scriptRef: output.reference_script_hash || undefined,
      },
    }));
  }

  /**
   * Override submitTx to use proxy
   */
  async submitTx(tx: string): Promise<string> {
    const endpoint = `/tx/submit`;

    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        method: 'POST',
        body: tx
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit transaction');
    }

    return await response.json();
  }

  /**
   * Override evaluateTx to use proxy
   */
  async evaluateTx(tx: string): Promise<any> {
    const endpoint = `/utils/txs/evaluate`;

    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        method: 'POST',
        body: tx,
        contentType: 'application/cbor'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to evaluate transaction');
    }

    const data = await response.json();
    console.log('[ProxiedBlockfrostProvider] evaluateTx raw response:', JSON.stringify(data).substring(0, 1000));

    // Handle Ogmios format response
    if (data && typeof data === 'object' && 'result' in data) {
      const result = data.result;

      // Check for EvaluationFailure
      if (result.EvaluationFailure) {
        const failures = result.EvaluationFailure;
        console.error('[ProxiedBlockfrostProvider] Script evaluation failed:', JSON.stringify(failures, null, 2));

        // Extract script failure details
        if (failures.ScriptFailures && Object.keys(failures.ScriptFailures).length > 0) {
          const failureDetails = Object.entries(failures.ScriptFailures)
            .map(([key, value]: [string, any]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ');
          throw new Error(`Script evaluation failed: ${failureDetails}`);
        } else {
          throw new Error('Script evaluation failed with no specific error details. This may indicate a script logic error or missing required data.');
        }
      }

      // Check for EvaluationResult (success case)
      if (result.EvaluationResult) {
        const evalResult = result.EvaluationResult;
        console.log('[ProxiedBlockfrostProvider] Evaluation succeeded:', evalResult);

        // Convert object format to array format
        // { "spend:0": {...}, "mint:0": {...} } => [{ index: 0, tag: "spend", ... }, ...]
        if (evalResult && typeof evalResult === 'object' && !Array.isArray(evalResult)) {
          const entries = Object.entries(evalResult);
          const converted = entries.map(([key, value]) => {
            const match = key.match(/^(spend|mint|withdraw|cert|reward):(\d+)$/);
            if (match) {
              const [, tag, indexStr] = match;
              return {
                tag,
                index: parseInt(indexStr),
                ...(typeof value === 'object' ? value : {})
              };
            }
            return value;
          });
          console.log('[ProxiedBlockfrostProvider] Converted evaluation result to array:', converted);
          return converted;
        }

        return evalResult;
      }
    }

    // Fallback: return data as-is
    console.warn('[ProxiedBlockfrostProvider] Unexpected evaluation response format, returning as-is');
    return data;
  }

  /**
   * Override fetchBlockInfo to use proxy
   */
  async fetchBlockInfo(hash: string): Promise<BlockInfo> {
    const endpoint = `/blocks/${hash}`;

    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method: 'GET' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch block info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Override fetchProtocolParameters to use proxy
   */
  async fetchProtocolParameters(epoch?: number): Promise<Protocol> {
    const endpoint = epoch !== undefined
      ? `/epochs/${epoch}/parameters`
      : `/epochs/latest/parameters`;

    const response = await fetch(this.proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method: 'GET' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch protocol parameters: ${response.statusText}`);
    }

    return await response.json();
  }
}
