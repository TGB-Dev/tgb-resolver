import { generatedClient } from "@tgb-resolver/contracts";

import { API_BASE_URL } from "@/lib/runtime-config";
import { getServerNow } from "@/lib/server-clock";

export { getServerNow };

generatedClient.setConfig({
  baseUrl: API_BASE_URL,
});

export const apiClient = {
  get: () => Promise.resolve({ data: "TGB Resolver Server", error: undefined }),
};
