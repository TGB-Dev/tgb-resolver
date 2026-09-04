import { type AnimationPlaybackControls, animate, type KeyframeOptions } from "motion";

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
) {
  const { block = "end", duration = 0.5, ease = TgbResolverEasings.swiftOut } = options;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const transform = getComputedStyle(element).transform;
  const translateY = transform !== "none" ? new DOMMatrix(transform).m42 : 0;
  const top = elementRect.top - translateY - containerRect.top + container.scrollTop;
  const bottom = top + elementRect.height;
  const target =
    block === "start"
      ? top
      : block === "center"
        ? top - (container.clientHeight - elementRect.height) / 2
        : bottom - container.clientHeight;
  const clamped = Math.max(0, Math.min(target, container.scrollHeight - container.clientHeight));
  activeByContainer.get(container)?.stop();
  if (Math.abs(clamped - container.scrollTop) < 0.5) return undefined;
  const controls = animate(container.scrollTop, clamped, {
    duration,
    ease,
    onUpdate: (value) => {
      container.scrollTop = value;
    },
    onComplete: () => {
      if (activeByContainer.get(container) === controls) activeByContainer.delete(container);
    },
  });
  activeByContainer.set(container, controls);
  return controls;
}
