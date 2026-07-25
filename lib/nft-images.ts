import type { Project } from './project';

/**
 * Locally bundled copies of the NFT artwork, keyed by the IPFS CID that the
 * project metadata points at.
 *
 * The NFTs carry `ipfs://<cid>` in their metadata, but public IPFS gateways are
 * slow and not always reachable — `QmY53cEvybvh9BkHjgGeP2C8mG5FEjLcnVjegkGeTmqEQ1`
 * currently 504s on ipfs.io, cloudflare-ipfs.com and dweb.link alike. Serving the
 * artwork from `public/` keeps the dashboard fast and keeps it working when the
 * gateways are down.
 *
 * Each file here must be byte-identical to what the CID resolves to. Verified:
 *   bafybeiawevoxo5eu356onvotbfqnvjfrffy6yg4nnqikrfgoas3wp3a5ja
 *     sha256 52377bafe23b0b4dff7bd58f3a3382d5647b1cc5263c55132761d80ea09f02d6
 *     == public/images/project/cardano/preview.jpg
 *
 * When a new series ships, add its CID here and drop the matching file into
 * `public/images/project/`.
 */
const LOCAL_IMAGE_BY_IPFS_CID: Readonly<Record<string, string>> = {
  bafybeiawevoxo5eu356onvotbfqnvjfrffy6yg4nnqikrfgoas3wp3a5ja:
    '/images/project/cardano/preview.jpg',
};

/** Strips `ipfs://` / `ipfs://ipfs/` and any trailing path so only the CID is left. */
const extractIpfsCid = (url: string): string | null => {
  const trimmed = url.trim();

  const withoutScheme = trimmed.startsWith('ipfs://ipfs/')
    ? trimmed.slice('ipfs://ipfs/'.length)
    : trimmed.startsWith('ipfs://')
      ? trimmed.slice('ipfs://'.length)
      : trimmed;

  return withoutScheme.split('/')[0] || null;
};

/**
 * Resolves the artwork to show for an NFT belonging to `project`.
 *
 * Resolution order is entirely local — an IPFS gateway URL is never returned,
 * because the point of the CID map is to avoid the gateway round-trip:
 *   1. the bundled copy of the CID named in the project metadata
 *   2. the project's own preview / main image
 *   3. `null`, letting the caller render its own placeholder
 */
export const resolveProjectNftImage = (project?: Project | null): string | null => {
  if (!project) {
    return null;
  }

  const metadataImage = typeof project.metadata?.image === 'string' ? project.metadata.image : null;

  if (metadataImage) {
    const cid = extractIpfsCid(metadataImage);
    const localImage = cid ? LOCAL_IMAGE_BY_IPFS_CID[cid] : undefined;

    if (localImage) {
      return localImage;
    }

    // Not fatal — we fall back to the project image below — but it means a new
    // series shipped without its artwork being added to LOCAL_IMAGE_BY_IPFS_CID.
    console.warn(
      `[nft-images] No bundled artwork for ${metadataImage} (project ${project.id}); falling back to the project image.`,
    );
  }

  return project.previewImage || project.mainImage || null;
};
