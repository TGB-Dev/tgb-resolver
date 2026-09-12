import { generatedClient } from "@tgb-resolver/contracts";

import { API_BASE_URL } from "@/lib/runtime-config";
import { getServerNow } from "@/lib/server-clock";
import { TOKEN_KEY } from "@/stores/auth-store";

export { getServerNow };

generatedClient.setConfig({
  baseUrl: API_BASE_URL,
});

generatedClient.interceptors.request.use((request) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return request;
});

export const apiClient = {
  get: () => Promise.resolve({ data: "TGB Resolver Server", error: undefined }),
};
