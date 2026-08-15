import { Text } from "@chakra-ui/react";
import { defineForm, FieldDataType } from "@tgb-form/core";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { type AnimationPlaybackControls, animate } from "motion/react";

import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { TgbResolverEasings } from "@/features/shared/anim/easings";

import { ExtensionType, getExtensionPayload, type ScriptOnlyExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";

/**
 * The audience leaderboard lives inside the only scrollable Box on the resolve
 * screen (apps/web/src/routes/index.tsx). ScriptOnly extensions have no mounted
 * DOM node of their own, so the scroller locates the container by this marker.
 */
export const AUDIENCE_SCROLL_SELECTOR = "[data-audience-scroll]";

export type ScrollerExtensionPayload = Record<string, unknown> & {
  duration?: number;
};

const formSchema = defineForm(
  {
    fields: {
      duration: {
        type: FieldDataType.Number,
        defaultValue: 10,
        label: "Duration (seconds)",
        description: "Time to scroll from the top to the bottom of the leaderboard.",
        props: { min: 0.1, max: 600, step: 0.5 },
      },
    },
  },
  { validators: sharedValidatorRegistry },
);

function findAudienceScrollContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(AUDIENCE_SCROLL_SELECTOR);
}

// A new two-phase scroll for a container supersedes any in-flight one. Without
// this, a re-executed script (dev StrictMode double-invoke, or a repeated
// activation signal) would start a second scroll-to-top animator that races
// the previous one and prevents the scroll from ever completing.
const activeByContainer = new WeakMap<HTMLElement, () => void>();

const debug = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.debug("[scroller]", ...args);
};

function scrollLeaderboardDown(duration: number): () => void {
  const container = findAudienceScrollContainer();
  if (!container) {
    debug("no [data-audience-scroll] container found");
    return () => undefined;
  }

  const lastRow = container.querySelector("tbody tr:last-of-type") as HTMLElement | null;
  if (!lastRow) {
    debug("no last row found inside the scroll container");
    return () => undefined;
  }
  debug("scroll container", {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
  });

  activeByContainer.get(container)?.();
  debug("phase 1: scroll to top over 1s");

  let stopped = false;
  let bottomControls: AnimationPlaybackControls | null = null;

  // Phase 1: ease back to the very top over 1 second.
  const topControls = animate(container.scrollTop, 0, {
    duration: 1,
    ease: TgbResolverEasings.inOutQuad,
    onUpdate: (latest) => {
      container.scrollTop = latest;
    },
  });

  // Phase 2: once at the top, scroll down to the bottom over the set duration.
  topControls.then(() => {
    if (stopped) return;
    debug("phase 2: scroll to bottom over", { duration });
    bottomControls =
      animateScrollIntoView(lastRow, container, {
        block: "end",
        duration,
        ease: TgbResolverEasings.inOutQuad,
      }) ?? null;
    if (!bottomControls) debug("phase 2: no-op (already at target or not scrollable)");
  });

  const cleanup = () => {
    stopped = true;
    topControls.stop();
    bottomControls?.stop();
    if (activeByContainer.get(container) === cleanup) activeByContainer.delete(container);
  };
  activeByContainer.set(container, cleanup);
  return cleanup;
}

export const ScrollerExtension: ScriptOnlyExtension = {
  type: ExtensionType.ScriptOnly,
  execute: (payload: ScrollerExtensionPayload) => {
    const duration = typeof payload?.duration === "number" ? payload.duration : 10;
    debug("execute", { duration, payload });
    return scrollLeaderboardDown(duration);
  },
  configForm: formSchema,
  extId: "scroller",
  shortName: "SCR",
  description: "Auto-scrolls the leaderboard from top to bottom over a set duration.",
  formatCueMessage: (event: TimelineTableItem) => {
    const payload = getExtensionPayload<ScrollerExtensionPayload>(event);
    const duration = payload?.duration ?? 10;
    return (
      <Text as="span">
        <Text as="span" fontFamily="mono" color="fg.muted">
          SCR
        </Text>{" "}
        | Duration:{" "}
        <Text as="span" fontFamily="mono" color="fg.success">
          {duration}s
        </Text>
      </Text>
    );
  },
};
