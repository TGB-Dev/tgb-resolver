import { beforeEach, describe, expect, it } from "vitest";

import { assetUrl } from "@/lib/asset-url";
import { API_BASE_URL } from "@/lib/runtime-config";
import { TOKEN_KEY } from "@/stores/auth-store";

describe("assetUrl", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appends the stored token for tag loads", () => {
    localStorage.setItem(TOKEN_KEY, "a+b/c=");
    expect(assetUrl("asset-1")).toBe(`${API_BASE_URL}/assets/asset-1?token=a%2Bb%2Fc%3D`);
  });

  it("omits the param when anonymous", () => {
    expect(assetUrl("asset-1")).toBe(`${API_BASE_URL}/assets/asset-1`);
  });
});
