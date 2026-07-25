'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface InstalledWallet {
  /** The `window.cardano` key. This is what Mesh's `connect()` expects. */
  id: string;
  /** Display name reported by the wallet itself (CIP-30 `name`). */
  name: string;
  /** Data-uri icon reported by the wallet (CIP-30 `icon`). */
  icon?: string;
  /** CIP-30 `apiVersion`. */
  version?: string;
}

export type WalletDetectionStatus = 'detecting' | 'ready' | 'not-found';

/**
 * Keys that are known to hold a CIP-30 wallet but are not guaranteed to be
 * enumerable on `window.cardano`. This only widens the sweep — a wallet is
 * never accepted because it is on this list, and never rejected because it is
 * missing from it. Detection itself is duck-typed against the CIP-30 shape, so
 * wallets that rename their key or ship after this list was written still work.
 */
const KNOWN_WALLET_KEYS: readonly string[] = [
  'nami',
  'lace',
  'eternl',
  'ccvault',
  'flint',
  'yoroi',
  'typhon',
  'typhoncip30',
  'vespr',
  'begin',
  'nufi',
  'nufiSnap',
  'gerowallet',
  'exodus',
  'lodestar',
  'nightly',
  'tokeo',
];

/** Non-wallet helpers some extensions hang off `window.cardano`. */
const IGNORED_KEYS: readonly string[] = ['enable', 'isEnabled', 'getBalance'];

const readCardanoKeys = (): readonly string[] => {
  if (typeof window === 'undefined' || !window.cardano) {
    return [];
  }

  try {
    return Object.keys(window.cardano).filter((key) => !IGNORED_KEYS.includes(key));
  } catch (error) {
    console.error('Failed to enumerate window.cardano:', error);
    return [];
  }
};

const toInstalledWallet = (id: string): InstalledWallet | null => {
  try {
    const candidate = window.cardano?.[id];

    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    // A usable CIP-30 provider must expose `enable()` and identify itself.
    // `icon` and `apiVersion` are treated as optional so a wallet that omits
    // them is still offered instead of silently disappearing.
    if (typeof candidate.enable !== 'function' || typeof candidate.name !== 'string') {
      return null;
    }

    return {
      id,
      name: id === 'nufiSnap' ? 'MetaMask' : candidate.name,
      icon: typeof candidate.icon === 'string' ? candidate.icon : undefined,
      version: typeof candidate.apiVersion === 'string' ? candidate.apiVersion : undefined,
    };
  } catch (error) {
    console.error(`Failed to inspect window.cardano.${id}:`, error);
    return null;
  }
};

/**
 * Reads the CIP-30 wallets currently injected into `window.cardano`.
 * Exported so non-React callers (and tests) can reuse the same detection.
 */
export const readInstalledWallets = (): readonly InstalledWallet[] => {
  if (typeof window === 'undefined' || !window.cardano) {
    return [];
  }

  const candidateKeys = Array.from(new Set([...readCardanoKeys(), ...KNOWN_WALLET_KEYS]));

  return candidateKeys
    .map(toInstalledWallet)
    .filter((wallet): wallet is InstalledWallet => wallet !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const signatureOf = (wallets: readonly InstalledWallet[]): string =>
  wallets.map((wallet) => wallet.id).join('|');

interface UseInstalledCardanoWalletsOptions {
  /** Detection only runs while this is true (e.g. while the modal is open). */
  enabled?: boolean;
  /** How long to keep polling before reporting `not-found`. */
  timeoutMs?: number;
  /** Poll interval. Extensions inject asynchronously, so one read is not enough. */
  intervalMs?: number;
}

interface UseInstalledCardanoWalletsResult {
  wallets: readonly InstalledWallet[];
  status: WalletDetectionStatus;
  /** Raw `window.cardano` keys — surfaced in the UI to make support triage possible. */
  detectedKeys: readonly string[];
  refresh: () => void;
}

/**
 * Enumerates the CIP-30 wallets actually injected into the page.
 *
 * Extensions inject `window.cardano.*` asynchronously and at different times,
 * so detection polls until at least one wallet appears or `timeoutMs` elapses.
 * Polling continues until the timeout even after the first hit, so a slow
 * extension is still picked up.
 */
export function useInstalledCardanoWallets({
  enabled = true,
  timeoutMs = 10_000,
  intervalMs = 700,
}: UseInstalledCardanoWalletsOptions = {}): UseInstalledCardanoWalletsResult {
  const [wallets, setWallets] = useState<readonly InstalledWallet[]>([]);
  const [detectedKeys, setDetectedKeys] = useState<readonly string[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const signatureRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    setTimedOut(false);

    const startedAt = Date.now();
    let timerId: number | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) {
        return;
      }

      const found = readInstalledWallets();
      const signature = signatureOf(found);

      // Avoid a re-render on every poll when nothing changed.
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setWallets(found);
      }

      setDetectedKeys((previous) => {
        const keys = readCardanoKeys();
        return keys.join('|') === previous.join('|') ? previous : keys;
      });

      if (Date.now() - startedAt >= timeoutMs) {
        setTimedOut(true);
        return;
      }

      timerId = window.setTimeout(tick, intervalMs);
    };

    tick();

    return () => {
      cancelled = true;
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, [enabled, timeoutMs, intervalMs, refreshToken]);

  const refresh = useCallback(() => {
    signatureRef.current = '';
    setWallets([]);
    setRefreshToken((token) => token + 1);
  }, []);

  const status: WalletDetectionStatus =
    wallets.length > 0 ? 'ready' : timedOut ? 'not-found' : 'detecting';

  return { wallets, status, detectedKeys, refresh };
}
