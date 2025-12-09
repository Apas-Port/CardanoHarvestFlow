import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

import { fetchMintedCountKoios } from '@/lib/fetch-minted-count-koios';
import { getNetworkConfig } from '@/lib/network-config';
import type { ServerNetworkConfig } from '@/lib/network-config';

interface ProjectEntry {
  id?: string;
  policyId?: string;
  legacyPolicyIds?: string[];
  mintedAmount?: number;
  collectionName?: string;
}

function resolveProjectsPath(isMainnet: boolean): string {
  return isMainnet ? '/data/projects.json' : '/data/dev-projects.json';
}

async function loadProjects(request: NextRequest, resourcePath: string): Promise<ProjectEntry[]> {
  try {
    // Load file directly from filesystem on server-side to avoid 401 errors on Vercel
    // Determine filename from resourcePath (/data/projects.json or /data/dev-projects.json)
    const isMainnet = resourcePath.includes('projects.json') && !resourcePath.includes('dev-projects.json');
    const fileName = isMainnet ? 'projects.json' : 'dev-projects.json';
    
    // Build file path (process.cwd() points to project root)
    const filePath = join(process.cwd(), 'public', 'data', fileName);
    
    // Read file synchronously
    const fileContents = readFileSync(filePath, 'utf-8');
    const projects = JSON.parse(fileContents);
    
    // Validate and return array
    return Array.isArray(projects) ? (projects as ProjectEntry[]) : [];
  } catch (error) {
    console.error('[minted-count] Unexpected error while loading project data:', error);
    // Return empty array on error to allow processing to continue
    return [];
  }
}

function findProject(projects: ProjectEntry[], policyId?: string, projectId?: string): ProjectEntry | null {
  if (projectId) {
    const normalizedId = projectId.toLowerCase();
    const match = projects.find((project) => project.id?.toLowerCase() === normalizedId);
    if (match) {
      return match;
    }
  }

  if (policyId) {
    const normalizedPolicy = policyId.toLowerCase();
    const match =
      projects.find((project) => project.policyId?.toLowerCase() === normalizedPolicy) ??
      projects.find((project) =>
        Array.isArray(project.legacyPolicyIds) &&
        project.legacyPolicyIds.some((legacy) => legacy?.toLowerCase() === normalizedPolicy),
      );
    if (match) {
      return match;
    }
  }

  return null;
}

async function fetchMintedCountFromBlockfrost(policyId: string, config: ServerNetworkConfig): Promise<number | null> {
  const { blockfrostApiKey, blockfrostUrl } = config;

  if (!blockfrostApiKey || !blockfrostUrl) {
    return null;
  }

  const trimmedPolicy = policyId.trim();
  if (!trimmedPolicy) {
    return 0;
  }

  const normalizedBaseUrl = blockfrostUrl.replace(/\/$/, '');
  const pageSize = 100;
  const maxPages = 10;
  let total = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const url = `${normalizedBaseUrl}/assets/policy/${trimmedPolicy}?page=${page}`;

    try {
      const response = await fetch(url, {
        headers: {
          project_id: blockfrostApiKey,
        },
        cache: 'no-store',
      });

      if (response.status === 404) {
        break;
      }

      if (!response.ok) {
        console.error('[minted-count] Blockfrost API error', {
          policyId: trimmedPolicy,
          status: response.status,
          statusText: response.statusText,
          page,
        });
        return total > 0 ? total : null;
      }

      const totalCountHeader =
        response.headers.get('cf-total-count') ??
        response.headers.get('total_count') ??
        response.headers.get('x-total-count');

      if (totalCountHeader) {
        const parsedTotal = Number(totalCountHeader);
        if (Number.isFinite(parsedTotal)) {
          return parsedTotal;
        }
      }

      const assets = await response.json();
      if (!Array.isArray(assets)) {
        console.error('[minted-count] Unexpected Blockfrost response shape', {
          policyId: trimmedPolicy,
          page,
        });
        return total > 0 ? total : null;
      }

      total += assets.length;

      if (assets.length < pageSize) {
        break;
      }
    } catch (error) {
      console.error('[minted-count] Blockfrost request failed', {
        policyId: trimmedPolicy,
        page,
        error,
      });
      return total > 0 ? total : null;
    }
  }

  return total;
}

async function getMintedCountForPolicy(policyId: string, config: ServerNetworkConfig, request: NextRequest): Promise<number> {
  if (!policyId) {
    return 0;
  }

  const normalizedPolicy = policyId.trim().toLowerCase();
  if (!normalizedPolicy) {
    return 0;
  }

  let mintedCount = 0;

  const blockfrostCount = await fetchMintedCountFromBlockfrost(normalizedPolicy, config);
  if (typeof blockfrostCount === 'number' && Number.isFinite(blockfrostCount)) {
    mintedCount = Math.max(0, blockfrostCount);
  }

  if (mintedCount <= 0) {
    try {
      const koiosCount = await fetchMintedCountKoios(normalizedPolicy, request);
      if (Number.isFinite(koiosCount) && koiosCount > mintedCount) {
        mintedCount = koiosCount;
      }
    } catch (error) {
      console.error('[minted-count] Koios request failed', {
        policyId: normalizedPolicy,
        error,
      });
    }
  }

  return mintedCount;
}

async function resolveMintedCount(
  project: ProjectEntry | null,
  policyIdParam: string | null | undefined,
  config: ServerNetworkConfig,
  request: NextRequest,
): Promise<number> {
  if (policyIdParam) {
    return getMintedCountForPolicy(policyIdParam, config, request);
  }

  if (project && typeof project.mintedAmount === 'number') {
    return Number.isFinite(project.mintedAmount) ? Number(project.mintedAmount) : 0;
  }

  const policyCandidates = project
    ? [project.policyId, ...(Array.isArray(project.legacyPolicyIds) ? project.legacyPolicyIds : [])]
    : [];

  const normalizedPolicies = policyCandidates
    .map((policy) => (typeof policy === 'string' ? policy.trim().toLowerCase() : undefined))
    .filter((value): value is string => Boolean(value));

  if (normalizedPolicies.length === 0) {
    return 0;
  }

  const uniquePolicies = Array.from(new Set(normalizedPolicies));
  const counts = await Promise.all(
    uniquePolicies.map((policy) => getMintedCountForPolicy(policy, config, request))
  );

  return counts.reduce((total, count) => total + (Number.isFinite(count) ? count : 0), 0);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectIdParam = searchParams.get('projectId') ?? undefined;
    const policyIdParam = searchParams.get('policyId') ?? undefined;

    if (!projectIdParam && !policyIdParam) {
      return NextResponse.json({ error: 'projectId or policyId is required' }, { status: 400 });
    }

    const config = getNetworkConfig(request) as ServerNetworkConfig;
    const projectsPath = resolveProjectsPath(config.isMainnet);
    const projects = await loadProjects(request, projectsPath);
    const project = findProject(projects, policyIdParam ?? undefined, projectIdParam);

    if (!project || !project.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const mintedCount = await resolveMintedCount(project, policyIdParam, config, request);

    return NextResponse.json({
      success: true,
      projectId: project.id,
      policyId: policyIdParam ?? project.policyId,
      mintedCount,
      collectionName: project.collectionName ?? 'Harvestflow Collection',
    });
  } catch (error) {
    console.error('[minted-count] Unexpected handler error:', error);
    return NextResponse.json({ error: 'Failed to fetch minted count' }, { status: 500 });
  }
}
