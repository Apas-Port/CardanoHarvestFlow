type PlainRecord = Record<string, unknown>;

export interface MintMetadataResolution {
  metadata: PlainRecord;
  appliedSources: string[];
}

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeRecords(base: PlainRecord, override: PlainRecord): PlainRecord {
  const result: PlainRecord = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];

    if (isPlainRecord(existing) && isPlainRecord(value)) {
      result[key] = mergeRecords(existing, value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

export async function getMintMetadataFilePath(projectId?: string): Promise<string | null> {
  // Metadata JSON files are no longer used - all metadata comes from projects.json
  return null;
}

export function mergeMetadataRecords(base: PlainRecord, override?: PlainRecord | null): PlainRecord {
  if (!override) {
    return { ...base };
  }
  return mergeRecords(base, override);
}

export async function resolveMintMetadataForToken(params: {
  projectId?: string;
  policyId?: string;
  tokenId: number;
  collectionName?: string;
  assetName?: string;
  additionalContext?: PlainRecord;
}): Promise<MintMetadataResolution | null> {
  // Metadata JSON files are no longer used - all metadata comes from projects.json
  // This function now always returns null, and callers should use fallback metadata
  return null;
}
