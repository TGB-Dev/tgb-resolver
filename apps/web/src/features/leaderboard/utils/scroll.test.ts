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
  // jsdom rects are all zero, so a scrolled container (scrollTop !== 0) is
  // never "already at" the computed target (0).
  function scrolledContainer(): HTMLElement {
    const container = document.createElement("div");
    container.scrollTop = 50;
    return container;
  }

  function startedAnimation(element: HTMLElement, container: HTMLElement) {
    const controls = animateScrollIntoView(element, container);
    expect(controls).toBeDefined();
    return controls as NonNullable<ReturnType<typeof animateScrollIntoView>>;
  }

  test("stops the previous in-flight animation before starting a new one", () => {
    const element = document.createElement("div");
    const container = scrolledContainer();

    const first = startedAnimation(element, container);

    animateScrollIntoView(element, container);

    expect(first.stop).toHaveBeenCalledTimes(1);
  });

  test("does not stop an animation running on a different container", () => {
    const element = document.createElement("div");
    const firstContainer = scrolledContainer();
    const secondContainer = scrolledContainer();

    const first = startedAnimation(element, firstContainer);
    animateScrollIntoView(element, secondContainer);

    // The leaderboard follow-scroll and the timeline current-event scroller
    // run in the same frame on different containers; they must not cancel
    // each other.
    expect(first.stop).not.toHaveBeenCalled();
  });

  test("clears the active handle on completion so a finished animation is not stopped", () => {
    const element = document.createElement("div");
    const container = scrolledContainer();

    const first = startedAnimation(element, container);
    lastOnComplete?.();

    animateScrollIntoView(element, container);

    expect(first.stop).not.toHaveBeenCalled();
  });

  test("does not start an animation when the container is already at the target", () => {
    const element = document.createElement("div");
    const container = document.createElement("div");

    const result = animateScrollIntoView(element, container);

    expect(result).toBeUndefined();
    expect(animateMock).not.toHaveBeenCalled();
  });

  test("leaves no handle behind in the active map after a skip", () => {
    const element = document.createElement("div");
    const container = document.createElement("div");

    animateScrollIntoView(element, container);

    container.scrollTop = 50;
    const first = startedAnimation(element, container);

    animateScrollIntoView(element, container);

    // The skipped call must not have registered a stale handle: the first
    // real animation is superseded exactly once, not stopped twice.
    expect(first.stop).toHaveBeenCalledTimes(1);
  });

  test("starts an animation when the container is not at the target", () => {
    const element = document.createElement("div");
    const container = scrolledContainer();

    const result = animateScrollIntoView(element, container);

    expect(result).toBeDefined();
    expect(animateMock).toHaveBeenCalledTimes(1);
    expect(animateMock).toHaveBeenCalledWith(50, 0, expect.objectContaining({ duration: 0.5 }));
  });
});
