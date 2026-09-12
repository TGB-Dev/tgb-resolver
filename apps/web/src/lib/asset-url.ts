import { API_BASE_URL } from "@/lib/runtime-config";
import { readStoredToken } from "@/stores/auth-store";

export function assetUrl(assetId: string): string {
  const token = readStoredToken();
  const base = `${API_BASE_URL}/assets/${assetId}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
