import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test, vi } from "vitest";

import { withRetry } from "./hooks";

describe("withRetry", () => {
  test("retries once on 409 and succeeds", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 409 })
      .mockResolvedValueOnce("success");

    const result = await withRetry(queryClient, fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(refetchSpy).toHaveBeenCalled();
  });

  test("does not retry on non-409 errors", async () => {
    const queryClient = new QueryClient();
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("network error"));

    await expect(withRetry(queryClient, fn)).rejects.toThrow("network error");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
