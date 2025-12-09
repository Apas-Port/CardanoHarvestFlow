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
    console.log('[ProxiedBlockfrostProvider] evaluateTx raw response:', JSON.stringify(data, null, 2));

    // Handle Ogmios format response
    if (data && typeof data === 'object' && 'result' in data) {
      const result = data.result;

      // Check for EvaluationFailure
      if (result.EvaluationFailure) {
        const failures = result.EvaluationFailure;
        
        // 詳細なエラーログを出力
        console.error('========== EVALUATION FAILURE DETAILS ==========');
        console.error('[ProxiedBlockfrostProvider] Full failure object:', JSON.stringify(failures, null, 2));
        
        // ScriptFailuresの詳細を抽出
        if (failures.ScriptFailures && Object.keys(failures.ScriptFailures).length > 0) {
          const scriptFailures = failures.ScriptFailures;
          console.error('[ProxiedBlockfrostProvider] Script failures found:', Object.keys(scriptFailures).length);
          
          // 各スクリプトの失敗詳細を出力
          Object.entries(scriptFailures).forEach(([key, value]: [string, any]) => {
            console.error(`[ProxiedBlockfrostProvider] Script failure [${key}]:`, JSON.stringify(value, null, 2));
            
            // エラーメッセージを抽出（可能な場合）
            if (value && typeof value === 'object') {
              if ('message' in value) {
                console.error(`[ProxiedBlockfrostProvider] Error message: ${value.message}`);
              }
              if ('error' in value) {
                console.error(`[ProxiedBlockfrostProvider] Error: ${JSON.stringify(value.error, null, 2)}`);
              }
              if ('cause' in value) {
                console.error(`[ProxiedBlockfrostProvider] Cause: ${JSON.stringify(value.cause, null, 2)}`);
              }
            }
          });
          
          // 読みやすいエラーメッセージを構築
          const failureDetails = Object.entries(scriptFailures)
            .map(([key, value]: [string, any]) => {
              const scriptType = key.includes('spend') ? 'Oracle Script' : 
                                key.includes('mint') ? 'NFT Mint Script' : 
                                'Unknown Script';
              const errorMsg = value?.message || value?.error || JSON.stringify(value);
              return `${scriptType} (${key}): ${errorMsg}`;
            })
            .join('\n');
          
          console.error('==============================================');
          throw new Error(`Script evaluation failed:\n${failureDetails}`);
        } 
        
        // Other failure types
        if (failures.OtherFailures) {
          console.error('[ProxiedBlockfrostProvider] Other failures:', JSON.stringify(failures.OtherFailures, null, 2));
        }
        
        console.error('==============================================');
        throw new Error('Script evaluation failed with no specific error details. This may indicate a script logic error or missing required data.');
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

    // Format 2: Direct Blockfrost format
    if (data && typeof data === 'object' && 'EvaluationFailure' in data) {
      const failures = data.EvaluationFailure;
      console.error('[ProxiedBlockfrostProvider] Direct format EvaluationFailure:', JSON.stringify(failures, null, 2));
      
      if (failures.ScriptFailures) {
        const failureDetails = Object.entries(failures.ScriptFailures)
          .map(([key, value]: [string, any]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        throw new Error(`Script evaluation failed:\n${failureDetails}`);
      }
      throw new Error('Script evaluation failed');
    }

    // Fallback: return data as-is
    console.warn('[ProxiedBlockfrostProvider] Unexpected evaluation response format:', JSON.stringify(data, null, 2));
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
