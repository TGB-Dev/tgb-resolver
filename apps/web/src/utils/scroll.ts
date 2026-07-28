import { type AnimationPlaybackControls, animate, type KeyframeOptions } from "motion/react";

interface ScrollOptions {
  block?: "start" | "center" | "end";
  duration?: number;
  ease?: KeyframeOptions["ease"];
}

export function animateScrollIntoView(
  element: HTMLElement,
  container: HTMLElement,
  options: ScrollOptions = {},
): AnimationPlaybackControls {
  const { block = "end", duration = 0.5, ease = "easeOut" } = options;

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // Extract active CSS translateY from Framer Motion's FLIP transform
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

  // Animate container.scrollTop smoothly
  return animate(container.scrollTop, targetScrollTop, {
    duration,
    ease,
    onUpdate: (latest) => {
      container.scrollTop = latest;
    },
  });
}
