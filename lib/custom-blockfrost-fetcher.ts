import type { UTxO } from '@meshsdk/common';

/**
 * Custom Blockfrost fetcher that directly calls Blockfrost API
 * This bypasses MeshSDK's BlockfrostProvider which seems to have issues
 */
export class CustomBlockfrostFetcher {
  constructor(
    private apiKey: string,
    private baseUrl: string
  ) {}

  /**
   * Fetch current Plutus cost models so MeshTxBuilder can compute the
   * script integrity hash against the live on-chain protocol parameters
   * (required since the van Rossem cost model update).
   */
  async fetchCostModels(epoch?: number): Promise<number[][]> {
    const path = epoch !== undefined
      ? `/epochs/${epoch}/parameters`
      : `/epochs/latest/parameters`;

    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'project_id': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data?.cost_models_raw?.PlutusV1) {
      throw new Error('Cost models are not available from Blockfrost API.');
    }

    return [
      data.cost_models_raw.PlutusV1,
      data.cost_models_raw.PlutusV2,
      data.cost_models_raw.PlutusV3,
    ];
  }

  async fetchAddressUTxOs(address: string, asset?: string): Promise<UTxO[]> {
    // If asset is specified, use asset-specific endpoint for more reliable results
    const url = asset 
      ? `${this.baseUrl}/addresses/${address}/utxos/${asset}`
      : `${this.baseUrl}/addresses/${address}/utxos`;
    console.log('[CustomBlockfrostFetcher] Fetching UTxOs from:', url);

    const response = await fetch(url, {
      headers: {
        'project_id': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CustomBlockfrostFetcher] API error:', errorText);
      throw new Error(`Blockfrost API error: ${response.status} ${response.statusText}`);
    }

    const utxos = await response.json();
    console.log('[CustomBlockfrostFetcher] Raw UTxOs fetched:', utxos.length);

    // Convert Blockfrost format to MeshSDK UTxO format
    const meshUtxos: UTxO[] = utxos.map((utxo: any) => ({
      input: {
        outputIndex: utxo.output_index ?? utxo.tx_index ?? 0,
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
        scriptHash: null,
      },
    }));

    console.log('[CustomBlockfrostFetcher] Converted to MeshSDK format:', meshUtxos.length);
    return meshUtxos;
  }
}
