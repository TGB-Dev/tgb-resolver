import { type AnimationPlaybackControls, animate, type KeyframeOptions } from "motion/react";

import { TgbResolverEasings } from "@/features/shared/anim/easings";

interface ScrollOptions {
  block?: "start" | "center" | "end";
  duration?: number;
  ease?: KeyframeOptions["ease"];
}

let active: AnimationPlaybackControls | null = null;

export function animateScrollIntoView(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollOptions = {},
): AnimationPlaybackControls {
  // A new scroll supersedes any in-flight one: overlapping scrollTop writers
  // would double layout invalidation per frame and jitter the container.
  active?.stop();
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

  // Return animate's controls
  const controls = animate(container.scrollTop, targetScrollTop, {
    duration,
    ease,
    onUpdate: (latest) => {
      container.scrollTop = latest;
    },
    onComplete: () => {
      if (active === controls) active = null;
    },
  });
  active = controls;
  return controls;
}
