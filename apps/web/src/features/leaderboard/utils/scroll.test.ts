import { animate } from "motion/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { animateScrollIntoView } from "./scroll";

vi.mock("motion/react", async (importOriginal) => {
  const mod = await importOriginal<typeof import("motion/react")>();
  return { ...mod, animate: vi.fn() };
});

const animateMock = vi.mocked(animate);
let lastOnComplete: (() => void) | undefined;

beforeEach(() => {
  lastOnComplete = undefined;
  animateMock.mockReset();
  animateMock.mockImplementation((_from, _to, options) => {
    lastOnComplete = options?.onComplete;
    return { stop: vi.fn() } as unknown as ReturnType<typeof animate>;
  });
});

describe("animateScrollIntoView", () => {
  test("stops the previous in-flight animation before starting a new one", () => {
    const element = document.createElement("div");
    const container = document.createElement("div");

    const first = animateScrollIntoView(element, container);

    animateScrollIntoView(element, container);

    expect(first.stop).toHaveBeenCalledTimes(1);
  });

  test("does not stop an animation running on a different container", () => {
    const element = document.createElement("div");
    const firstContainer = document.createElement("div");
    const secondContainer = document.createElement("div");

    const first = animateScrollIntoView(element, firstContainer);
    animateScrollIntoView(element, secondContainer);

    // The leaderboard follow-scroll and the timeline current-event scroller
    // run in the same frame on different containers; they must not cancel
    // each other.
    expect(first.stop).not.toHaveBeenCalled();
  });

  test("clears the active handle on completion so a finished animation is not stopped", () => {
    const element = document.createElement("div");
    const container = document.createElement("div");

    const first = animateScrollIntoView(element, container);
    lastOnComplete?.();

    animateScrollIntoView(element, container);

    expect(first.stop).not.toHaveBeenCalled();
  });
});
