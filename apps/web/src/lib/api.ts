import { generatedClient } from "@tgb-resolver/contracts";

import { getServerNow } from "@/lib/realtime-client";

export { getServerNow };

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

generatedClient.setConfig({
  baseUrl: API_BASE_URL,
});

export const apiClient = {
  get: () => Promise.resolve({ data: "TGB Resolver Server", error: undefined }),
};
