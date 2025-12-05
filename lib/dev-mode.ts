/**
 * Dev Mode Detection Utility
 *
 * Enables preprod network and dev-projects.json when URL parameter ?dev is present
 * Example: http://localhost:3000?dev
 */

/**
 * Check if dev mode is enabled via URL parameter
 * Client-side only - checks window.location
 */
export function isDevModeFromURL(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.has('dev');
}

/**
 * Check if dev mode is enabled from Next.js request
 * Server-side only - checks request URL
 */
export function isDevModeFromRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    return url.searchParams.has('dev');
  } catch {
    return false;
  }
}

/**
 * Get the appropriate project file name based on dev mode
 */
export function getProjectFileName(isDevMode: boolean): 'dev-projects.json' | 'projects.json' {
  return isDevMode ? 'dev-projects.json' : 'projects.json';
}

export function appendDevQuery(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }

  if (!isDevModeFromURL()) {
    return path;
  }

  try {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('dev', '1');
    const relative = `${url.pathname}${url.search}${url.hash}`;
    // Preserve relative format if original path was relative
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return url.toString();
    }
    return relative.startsWith('/') ? relative : `/${relative}`;
  } catch {
    return path.includes('?') ? `${path}&dev=1` : `${path}?dev=1`;
  }
}

/**
 * Check if we should use preprod network
 * Takes into account both URL parameter and environment settings
 */
export function shouldUsePreprod(isMainnetFromEnv: boolean): boolean {
  // URL parameter takes precedence
  if (typeof window !== 'undefined' && isDevModeFromURL()) {
    console.log('[dev-mode] URL parameter ?dev detected, using preprod network and dev-projects.json');
    return true;
  }

  // Otherwise use environment setting
  return !isMainnetFromEnv;
}
