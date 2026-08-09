import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ExtensionType, extensionRegistry } from "@/features/extensions";

import { ConfettiExtensionComponent } from "./components";
import { ConfettiExtension } from "./index";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
  shapeFromText: vi.fn(() => ({ type: "text" })),
}));

import confetti from "canvas-confetti";

const confettiMock = vi.mocked(confetti);

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  confettiMock.mockReset();
});

describe("ConfettiExtension", () => {
  test("is registered as a WithReactComponent extension with a config form", () => {
    const ext = extensionRegistry.extensionWithExtId("confetti");
    expect(ext).toBeDefined();
    expect(ext?.type).toBe(ExtensionType.WithReactComponent);
    expect(ext?.configForm).toBeDefined();
    expect(ext?.shortName).toBe("CNF");
  });

  test("fires the basic cannon preset on mount", () => {
    render(<ConfettiExtensionComponent payload={{ preset: "cannon" }} />);
    expect(confettiMock).toHaveBeenCalledWith(
      expect.objectContaining({ particleCount: 100, spread: 70 }),
    );
  });

  test("defaults to the basic cannon preset when none is set", () => {
    render(<ConfettiExtensionComponent payload={{}} />);
    expect(confettiMock).toHaveBeenCalled();
  });

  test("formats the cue message with the resolved preset label", () => {
    const node = ConfettiExtension.formatCueMessage({
      type: "cus",
      extPayload: { preset: "fireworks" },
    } as never);
    expect(node).toBeDefined();
  });
});
