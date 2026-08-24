import { describe, expect, test } from "vitest";

import { ExtensionType } from "./base/types";
import { extensionRegistry } from "./registry";

describe("extensionRegistry", () => {
  test("lists extensions with renderable Vue components", () => {
    expect(extensionRegistry.extensionList.length).toBeGreaterThan(0);
    for (const extension of extensionRegistry.extensionList) {
      if (extension.type === ExtensionType.WithVueComponent) {
        expect(extension.component).toBeTruthy();
        expect(
          typeof extension.component === "object" || typeof extension.component === "function",
        ).toBe(true);
      }
    }
  });

  test("extensions with config forms are selectable", () => {
    const withForms = extensionRegistry.extensionList.filter((ext) => ext.configForm);
    expect(withForms.map((ext) => ext.extId).sort()).toEqual(
      ["blank", "confetti", "img", "media", "scroller"].sort(),
    );
  });
});
