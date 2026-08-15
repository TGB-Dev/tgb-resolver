import { ChakraProvider } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ExtensionType, extensionRegistry } from "@/features/extensions";
import { system } from "@/features/shared/ui/provider";

import { BlankExtension, BlankExtensionComponent } from "./index";

describe("BlankExtension", () => {
  test("is registered as a WithReactComponent extension with a config form", () => {
    const ext = extensionRegistry.extensionWithExtId("blank");
    expect(ext).toBeDefined();
    expect(ext?.type).toBe(ExtensionType.WithReactComponent);
    expect(ext?.configForm).toBeDefined();
    expect(ext?.shortName).toBe("BLK");
  });

  test("renders a full-size blank overlay", () => {
    const { container } = render(
      <ChakraProvider value={system}>
        <BlankExtensionComponent payload={{ color: "black" }} />
      </ChakraProvider>,
    );
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toBeDefined();
    expect(overlay.tagName).toBe("DIV");
    expect(getComputedStyle(overlay).position).toBe("absolute");
    expect(getComputedStyle(overlay).zIndex).toBe("1000");
    const rules = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .map((rule) => rule.cssText)
      .join("\n");
    expect(rules).toContain(`.${overlay.className} { position: absolute;`);
    expect(rules).toContain("width: var(--chakra-sizes-full)");
    expect(rules).toContain("height: var(--chakra-sizes-full)");
    expect(rules).toContain("background: var(--chakra-colors-black)");
  });

  test("formats the cue message with the color", () => {
    const node = BlankExtension.formatCueMessage({
      type: "cus",
      extPayload: { color: "white" },
    } as never);
    expect(node).toBeDefined();
  });
});
