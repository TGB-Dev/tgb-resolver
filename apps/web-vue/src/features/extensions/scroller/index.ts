import { css } from "@styled-system/css";
import { defineForm, FieldDataType } from "@tgb-form/core";
import { type AnimationPlaybackControls, animate } from "motion";
import { h } from "vue";

import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { TgbResolverEasings } from "@/features/shared/anim/easings";

import { ExtensionType, getExtensionPayload, type ScriptOnlyExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";
import type { ScrollerExtensionPayload } from "./duration";

export { computeScrollerExtensionDuration } from "./duration";

const AUDIENCE_SCROLL_SELECTOR = "[data-audience-scroll]";

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

  const lastRow = container.querySelector(
    "tbody tr:last-of-type, [data-audience-row]:last-of-type",
  ) as HTMLElement | null;
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

  const topControls = animate(container.scrollTop, 0, {
    duration: 1,
    ease: TgbResolverEasings.inOutQuad,
    onUpdate: (latest) => {
      container.scrollTop = latest;
    },
  });

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
  extId: "scroller",
  shortName: "SCR",
  description: "Scroll the audience leaderboard.",
  configForm: formSchema,
  execute: (payload: Record<string, unknown>) => {
    const duration = typeof payload?.duration === "number" ? payload.duration : 10;
    debug("execute", { duration, payload });
    return scrollLeaderboardDown(duration);
  },
  formatCueMessage: (event) => {
    const duration = getExtensionPayload<ScrollerExtensionPayload>(event)?.duration ?? 10;
    return h("span", [
      h("span", { class: css({ fontFamily: "mono", color: "fg.muted" }) }, "SCR"),
      " | Duration: ",
      h("span", { class: css({ fontFamily: "mono", color: "fg.success" }) }, `${duration}s`),
    ]);
  },
};
