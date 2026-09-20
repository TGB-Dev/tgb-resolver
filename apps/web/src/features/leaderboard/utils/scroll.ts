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

// --- Unified list scrolling (virtualized + plain DOM) ---

export type ListScrollAlign = "start" | "center" | "end";
export type ListScrollBehavior = "auto" | "smooth";

/** Structural subset of a TanStack Virtualizer used for programmatic scroll. */
export interface VirtualListScroller {
  scrollToIndex(
    index: number,
    options?: { align?: ListScrollAlign; behavior?: ListScrollBehavior },
  ): void;
}

export interface ListScrollRequest {
  container: HTMLElement | null | undefined;
  /** Virtual-path target index. Ignored when no virtualizer is set. */
  index?: number;
  /** When set, scroll delegates to the virtualizer by index. */
  virtualizer?: VirtualListScroller | null;
  /** DOM-path lookup for unvirtualized lists. Required when virtualizer is absent. */
  selector?: string;
  align?: ListScrollAlign;
  /** Virtual path only; the DOM path always tweens via motion. */
  behavior?: ListScrollBehavior;
  /** DOM-path tween tuning. */
  duration?: number;
  ease?: KeyframeOptions["ease"];
}

/**
 * Single entry point for list follow-scrolls. Virtualized lists scroll by
 * index (off-screen rows aren't mounted, so selectors can't find them);
 * plain lists tween a queried row with motion. Returns the motion controls
 * for the DOM path, undefined for the virtual path.
 */
export function scrollToListItem(request: ListScrollRequest) {
  const {
    container,
    virtualizer,
    index = -1,
    selector,
    align = "end",
    behavior = "smooth",
    duration,
    ease,
  } = request;
  if (virtualizer) {
    if (index < 0) return undefined;
    virtualizer.scrollToIndex(index, { align, behavior });
    return undefined;
  }
  if (!container || !selector) return undefined;
  const el = container.querySelector<HTMLElement>(selector);
  if (!el) return undefined;
  return animateScrollIntoView(el, container, { block: align, duration, ease });
}
