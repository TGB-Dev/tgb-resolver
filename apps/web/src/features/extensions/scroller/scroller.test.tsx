import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ExtensionType, extensionRegistry } from "@/features/extensions";
import type { ScriptOnlyExtension } from "@/features/extensions/base/types";

import { AUDIENCE_SCROLL_SELECTOR, ScrollerExtension } from "./index";

vi.mock("motion/react", async (importActual) => {
  const actual = await importActual<typeof import("motion/react")>();
  return {
    ...actual,
    animate: vi.fn(
      () =>
        ({
          stop: vi.fn(),
          onComplete: vi.fn(),
          // biome-ignore lint/suspicious/noThenProperty: mock mimics motion's thenable controls
          then: (onResolve: () => void) => {
            onResolve();
            return Promise.resolve();
          },
        }) as unknown as ReturnType<typeof animate>,
    ),
  };
});

import { animate } from "motion/react";

const animateMock = vi.mocked(animate);

function makeRect(top: number, height: number) {
  return {
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
}

const scrollGeometry = {
  scrollHeight: { value: 2000, configurable: true },
  clientHeight: { value: 1000, configurable: true },
  getBoundingClientRect: {
    configurable: true,
    value(this: HTMLElement) {
      if (this.getAttribute?.("data-testid") === "scroll") return makeRect(0, 1000);
      if (this.tagName === "TR") return makeRect(1500, 100);
      return makeRect(0, 0);
    },
  },
};

let getComputedStyleSpy: ReturnType<typeof vi.spyOn> | undefined;

beforeEach(() => {
  animateMock.mockReset();
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", scrollGeometry.scrollHeight);
  Object.defineProperty(HTMLElement.prototype, "clientHeight", scrollGeometry.clientHeight);
  Object.defineProperty(
    HTMLElement.prototype,
    "getBoundingClientRect",
    scrollGeometry.getBoundingClientRect,
  );
  getComputedStyleSpy = vi
    .spyOn(window, "getComputedStyle")
    .mockReturnValue({ overflowY: "auto", transform: "none" } as CSSStyleDeclaration);
});

afterEach(() => {
  getComputedStyleSpy?.mockRestore();
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).getBoundingClientRect;
  document.body.innerHTML = "";
});

describe("ScrollerExtension", () => {
  test("is registered as a ScriptOnly extension with a config form", () => {
    const ext = extensionRegistry.extensionWithExtId("scroller") as ScriptOnlyExtension | undefined;
    expect(ext).toBeDefined();
    expect(ext?.type).toBe(ExtensionType.ScriptOnly);
    expect(ext?.configForm).toBeDefined();
    expect(ext?.shortName).toBe("SCR");
    expect(typeof ext?.execute).toBe("function");
  });

  test("execute starts a scroll animation to the bottom and returns a cleanup", async () => {
    document.body.innerHTML = `<div ${AUDIENCE_SCROLL_SELECTOR.slice(1, -1)}="" style="overflow-y: auto">
      <table><tbody><tr /></tbody></table>
    </div>`;

    const cleanup = ScrollerExtension.execute({ duration: 10 });

    await vi.waitFor(() => expect(animateMock).toHaveBeenCalledTimes(2));
    // Phase 1 (scroll to top) runs first, phase 2 (scroll to bottom) second.
    const bottomCall = animateMock.mock.calls[1];
    expect(bottomCall[0]).toBe(0);
    expect(bottomCall[2]).toMatchObject({ duration: 10, ease: [0.455, 0.03, 0.515, 0.955] });

    const topStop = animateMock.mock.results[0].value.stop;
    const bottomStop = animateMock.mock.results[1].value.stop;
    cleanup();
    expect(topStop).toHaveBeenCalled();
    expect(bottomStop).toHaveBeenCalled();
  });

  test("execute is a no-op without an audience scroll container", () => {
    const cleanup = ScrollerExtension.execute({ duration: 10 });
    expect(animateMock).not.toHaveBeenCalled();
    cleanup();
  });

  test("a second execute supersedes an in-flight one instead of racing it", async () => {
    document.body.innerHTML = `<div data-audience-scroll="" style="overflow-y: auto">
      <table><tbody><tr /></tbody></table>
    </div>`;

    const firstCleanup = ScrollerExtension.execute({ duration: 10 });
    const firstTopStop = animateMock.mock.results[0]?.value.stop as ReturnType<
      typeof animate
    >["stop"];

    const secondCleanup = ScrollerExtension.execute({ duration: 10 });
    const secondTopStop = animateMock.mock.results[1]?.value.stop as ReturnType<
      typeof animate
    >["stop"];
    // The first execution's phase-1 scroll-to-top is stopped immediately.
    expect(firstTopStop).toHaveBeenCalled();

    await vi.waitFor(() => expect(animateMock).toHaveBeenCalledTimes(4));
    expect(secondTopStop).toHaveBeenCalled();

    firstCleanup();
    secondCleanup();
  });

  test("formats the cue message with the duration", () => {
    const node = ScrollerExtension.formatCueMessage({
      type: "cus",
      extPayload: { duration: 7 },
    } as never);
    expect(node).toBeDefined();
  });
});
