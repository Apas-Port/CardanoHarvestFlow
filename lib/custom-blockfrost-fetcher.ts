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
