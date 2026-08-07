import { type AnimationPlaybackControls, animate, type KeyframeOptions } from "motion/react";

import { TgbResolverEasings } from "@/features/shared/anim/easings";

interface ScrollOptions {
  block?: "start" | "center" | "end";
  duration?: number;
  ease?: KeyframeOptions["ease"];
}

const activeByContainer = new WeakMap<HTMLElement, AnimationPlaybackControls>();

export function animateScrollIntoView(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollOptions = {},
): AnimationPlaybackControls | undefined {
  const { block = "end", duration = 0.5, ease = TgbResolverEasings.swiftOut } = options;

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // Extract active CSS translateY from motion/react's FLIP transform
  const transform = window.getComputedStyle(element).transform;
  let translateY = 0;
  if (transform && transform !== "none") {
    const matrix = new DOMMatrix(transform);
    translateY = matrix.m42;
  }

  // Calculate actual un-transformed top position relative to container layout
  const unTransformedElementTop =
    elementRect.top - translateY - containerRect.top + container.scrollTop;
  const unTransformedElementBottom = unTransformedElementTop + elementRect.height;

  let targetScrollTop = container.scrollTop;

  if (block === "end") {
    targetScrollTop = unTransformedElementBottom - container.clientHeight;
  } else if (block === "start") {
    targetScrollTop = unTransformedElementTop;
  } else if (block === "center") {
    targetScrollTop = unTransformedElementTop - (container.clientHeight - elementRect.height) / 2;
  }

  // Clamp within scroll bounds
  const maxScroll = container.scrollHeight - container.clientHeight;
  targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

  // A new scroll on the same container supersedes any in-flight one:
  // overlapping scrollTop writers would double layout invalidation per frame
  // and jitter the container. Animations on other containers run independently.
  activeByContainer.get(container)?.stop();

  // Already at the expected position: skip starting an animation. The active
  // map is left untouched (the supersession stop above is a no-op when no
  // animation is running), and an in-flight animation cannot drag the
  // container past the unchanged target.
  if (Math.abs(targetScrollTop - container.scrollTop) < 0.5) {
    return undefined;
  }

  // Return animate's controls
  const controls = animate(container.scrollTop, targetScrollTop, {
    duration,
    ease,
    onUpdate: (latest) => {
      container.scrollTop = latest;
    },
    onComplete: () => {
      if (activeByContainer.get(container) === controls) {
        activeByContainer.delete(container);
      }
    },
  });
  activeByContainer.set(container, controls);
  return controls;
}
