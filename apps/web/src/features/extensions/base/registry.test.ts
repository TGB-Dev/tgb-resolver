import { describe, expect, test } from "vitest";

import { extensionRegistry } from "./registry";

describe("extensionRegistry", () => {
  test("extensionWithExtId returns the registered extension", () => {
    const ext = extensionRegistry.extensionWithExtId("timer");

    expect(ext?.shortName).toBe("Timer");
    expect(extensionRegistry.extensionList).toContain(ext);
  });

  test("configFormFor returns the extension's config form", () => {
    expect(extensionRegistry.configFormFor("timer")).toBeDefined();
  });

  test("configFormFor returns undefined for unknown ids", () => {
    expect(extensionRegistry.configFormFor("nope")).toBeUndefined();
  });

  test("extensionWithExtId returns undefined for unknown ids", () => {
    expect(extensionRegistry.extensionWithExtId("nope")).toBeUndefined();
  });
});
