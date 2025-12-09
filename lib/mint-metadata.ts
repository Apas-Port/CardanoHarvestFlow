import { promises as fs } from 'fs';
import path from 'path';

type PlainRecord = Record<string, unknown>;

// Lazy import to avoid circular dependency
let getProjectById: ((projectId: string) => Promise<any>) | null = null;

interface MetadataGroup {
  default?: PlainRecord;
  tokens?: unknown;
}

interface MetadataConfig extends MetadataGroup {
  projects?: Record<string, MetadataGroup>;
  policies?: Record<string, MetadataGroup>;
}

export interface MintMetadataResolution {
  metadata: PlainRecord;
  appliedSources: string[];
}

interface MetadataCacheEntry {
  filePath: string;
  mtimeMs: number;
  config: MetadataConfig;
}

let metadataCache: MetadataCacheEntry | null = null;

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function applyPlaceholdersToValue(value: unknown, context: PlainRecord): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const replacement = context[key];
      if (replacement === undefined || replacement === null) {
        return match;
      }
      return String(replacement);
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => applyPlaceholdersToValue(entry, context));
  }

  if (isPlainRecord(value)) {
    const result: PlainRecord = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = applyPlaceholdersToValue(entry, context);
    }
    return result;
  }

  return value;
}

function normaliseTokenCollection(collection: unknown): PlainRecord | Record<string, PlainRecord> | Array<PlainRecord> | null {
  if (!collection) {
    return null;
  }

  if (Array.isArray(collection)) {
    return collection.filter((entry) => isPlainRecord(entry)) as Array<PlainRecord>;
  }

  if (isPlainRecord(collection)) {
    return collection;
  }

  return null;
}

function resolveTokenEntry(collection: unknown, tokenKey: string): PlainRecord | null {
  const normalised = normaliseTokenCollection(collection);
  if (!normalised) {
    return null;
  }

  if (Array.isArray(normalised)) {
    for (const entry of normalised) {
      const tokenIdValue = entry.tokenId;
      const tokenIdKey = typeof tokenIdValue === 'number' || typeof tokenIdValue === 'string'
        ? String(tokenIdValue)
        : undefined;

      if (tokenIdKey !== tokenKey) {
        continue;
      }

      if ('metadata' in entry && isPlainRecord((entry as PlainRecord).metadata)) {
        return (entry as PlainRecord).metadata as PlainRecord;
      }

      return entry;
    }

    return null;
  }

  const recordCollection = normalised as Record<string, unknown>;
  const direct = recordCollection[tokenKey];
  if (isPlainRecord(direct)) {
    return direct as PlainRecord;
  }

  return null;
}

function findGroupedEntry(groups: Record<string, MetadataGroup> | undefined, key?: string): [string, MetadataGroup] | null {
  if (!groups || !key) {
    return null;
  }

  const entries = Object.entries(groups);
  const lowerKey = key.toLowerCase();

  return entries.find(([candidate]) => {
    const candidateLower = candidate.toLowerCase();
    return candidate === key || candidateLower === lowerKey;
  }) ?? null;
}

function resolveMetadataSegments(
  config: MetadataConfig,
  tokenKey: string,
  context: PlainRecord,
  options: { projectId?: string; policyId?: string },
): Array<{ source: string; metadata: PlainRecord }> {
  const segments: Array<{ source: string; metadata: PlainRecord }> = [];

  if (config.default && isPlainRecord(config.default)) {
    segments.push({
      source: 'config.default',
      metadata: applyPlaceholdersToValue(clonePlain(config.default), context) as PlainRecord,
    });
  }

  const globalToken = resolveTokenEntry(config.tokens, tokenKey);
  if (globalToken) {
    segments.push({
      source: `config.tokens[${tokenKey}]`,
      metadata: applyPlaceholdersToValue(clonePlain(globalToken), context) as PlainRecord,
    });
  }

  const projectEntry = findGroupedEntry(config.projects, options.projectId);
  if (projectEntry) {
    const [projectKey, projectGroup] = projectEntry;

    if (projectGroup.default && isPlainRecord(projectGroup.default)) {
      segments.push({
        source: `projects.${projectKey}.default`,
        metadata: applyPlaceholdersToValue(clonePlain(projectGroup.default), context) as PlainRecord,
      });
    }

    const projectToken = resolveTokenEntry(projectGroup.tokens, tokenKey);
    if (projectToken) {
      segments.push({
        source: `projects.${projectKey}.tokens[${tokenKey}]`,
        metadata: applyPlaceholdersToValue(clonePlain(projectToken), context) as PlainRecord,
      });
    }
  }

  const policyEntry = findGroupedEntry(config.policies, options.policyId);
  if (policyEntry) {
    const [policyKey, policyGroup] = policyEntry;

    if (policyGroup.default && isPlainRecord(policyGroup.default)) {
      segments.push({
        source: `policies.${policyKey}.default`,
        metadata: applyPlaceholdersToValue(clonePlain(policyGroup.default), context) as PlainRecord,
      });
    }

    const policyToken = resolveTokenEntry(policyGroup.tokens, tokenKey);
    if (policyToken) {
      segments.push({
        source: `policies.${policyKey}.tokens[${tokenKey}]`,
        metadata: applyPlaceholdersToValue(clonePlain(policyToken), context) as PlainRecord,
      });
    }
  }

  return segments;
}

async function loadMetadataConfig(projectId?: string): Promise<MetadataConfig | null> {
  // Try to load from project metadataJsonPath first
  let metadataPath: string | null = null;
  
  if (projectId) {
    try {
      // Lazy import to avoid circular dependency
      if (!getProjectById) {
        const projectModule = await import('./project');
        getProjectById = projectModule.getProjectById;
      }
      
      if (getProjectById) {
        const project = await getProjectById(projectId);
        if (project?.metadataJsonPath) {
          metadataPath = project.metadataJsonPath;
        }
      }
    } catch (error) {
      console.warn('[mint-metadata] Failed to load project for metadataJsonPath:', error);
    }
  }

  // Fallback to environment variable
  if (!metadataPath) {
    metadataPath = process.env.MINT_METADATA_JSON_PATH?.trim() || null;
  }

  if (!metadataPath) {
    return null;
  }

  const resolvedPath = path.isAbsolute(metadataPath)
    ? metadataPath
    : path.resolve(process.cwd(), metadataPath);

  try {
    const stat = await fs.stat(resolvedPath);

    if (metadataCache && metadataCache.filePath === resolvedPath && metadataCache.mtimeMs === stat.mtimeMs) {
      return metadataCache.config;
    }

    const raw = await fs.readFile(resolvedPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!isPlainRecord(parsed)) {
      throw new Error('Mint metadata JSON must contain an object at the top level');
    }

    const config = parsed as MetadataConfig;
    metadataCache = {
      filePath: resolvedPath,
      mtimeMs: stat.mtimeMs,
      config,
    };

    return config;
  } catch (error) {
    console.error('[mint-metadata] Failed to load metadata file:', error);
    return null;
  }
}

export async function getMintMetadataFilePath(projectId?: string): Promise<string | null> {
  // Try to get from project first
  if (projectId) {
    try {
      if (!getProjectById) {
        const projectModule = await import('./project');
        getProjectById = projectModule.getProjectById;
      }
      
      if (getProjectById) {
        const project = await getProjectById(projectId);
        if (project?.metadataJsonPath) {
          const metadataPath = project.metadataJsonPath;
          return path.isAbsolute(metadataPath) ? metadataPath : path.resolve(process.cwd(), metadataPath);
        }
      }
    } catch (error) {
      console.warn('[mint-metadata] Failed to load project for metadataJsonPath:', error);
    }
  }

  // Fallback to environment variable
  const envPath = process.env.MINT_METADATA_JSON_PATH?.trim();
  if (!envPath) {
    return null;
  }
  return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
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
  const config = await loadMetadataConfig(params.projectId);
  if (!config) {
    return null;
  }

  const {
    projectId,
    policyId,
    tokenId,
    collectionName,
    assetName,
    additionalContext,
  } = params;

  const tokenKey = String(tokenId);

  const context: PlainRecord = {
    tokenId: tokenKey,
    tokenNumber: tokenId,
    projectId,
    projectIdLower: projectId?.toLowerCase(),
    policyId,
    policyIdLower: policyId?.toLowerCase(),
    collectionName,
    assetName,
    ...additionalContext,
  };

  const segments = resolveMetadataSegments(config, tokenKey, context, { projectId, policyId });
  if (segments.length === 0) {
    return null;
  }

  let metadata: PlainRecord = {};
  const appliedSources: string[] = [];

  for (const segment of segments) {
    metadata = mergeRecords(metadata, segment.metadata);
    appliedSources.push(segment.source);
  }

  return {
    metadata,
    appliedSources,
  };
}
