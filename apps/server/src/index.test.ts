import { describe, expect, test } from "vitest";

import { createApp } from "./index";
import { ShowServiceError } from "./show-service";

describe("createApp export bundle route", () => {
  test("serves bundled files without transport-level brotli encoding", async () => {
    const app = createApp({
      exportBundle: async () => Uint8Array.from([1, 2, 3]),
    } as never);

    const response = await app.handle(new Request("http://localhost/show/export/bundle"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/octet-stream");
    expect(response.headers.get("content-disposition")).toContain("show.tgbresolver");
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([1, 2, 3]));
  });

  test("legacy export path also skips transport-level brotli encoding", async () => {
    const app = createApp({
      exportBundle: async () => Uint8Array.from([4, 5, 6]),
    } as never);

    const response = await app.handle(new Request("http://localhost/show/export.tgbresolver"));

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([4, 5, 6]));
  });

  test("returns typed service errors on mutation failures", async () => {
    const app = createApp({
      optimize() {
        throw new ShowServiceError("readonly", 42, "Show is in live mode");
      },
    } as never);

    const response = await app.handle(
      new Request("http://localhost/show/optimize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ showVersion: 1 }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      reason: "readonly",
      showVersion: 42,
      message: "Show is in live mode",
    });
  });
});
