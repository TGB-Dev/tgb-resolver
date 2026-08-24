// Do not remove - used for live event preloading.
// Pre-fetches all asset bytes upfront so the playback engine never waits on the network.

import type { ShowAssetSnapshot } from "@tgb-resolver/contracts";

const cache = new Map<string, ArrayBuffer>();

export async function preloadAssets(
  assets: ShowAssetSnapshot[] | { items?: ShowAssetSnapshot[] },
  baseUrl: string,
): Promise<Map<string, ArrayBuffer>> {
  const list = Array.isArray(assets) ? assets : (assets.items ?? []);
  const results = await Promise.allSettled(
    list.map(async (asset) => {
      const id = asset.id ?? "";
      if (!id) return null;
      const url = `${baseUrl}/assets/${id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch asset ${id}: ${res.status}`);
      const buffer = await res.arrayBuffer();
      cache.set(id, buffer);
      return { id, buffer };
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("preloadAssets error:", result.reason);
    }
  }

  return cache;
}

export function getPreloadedAsset(id: string): ArrayBuffer | undefined {
  return cache.get(id);
}
