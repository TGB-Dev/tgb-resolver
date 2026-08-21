import { css } from "@styled-system/css";
import { h } from "vue";

import { ExtensionType, getExtensionPayload, type ScriptOnlyExtension } from "../base/types";
import type { ScrollerExtensionPayload } from "./duration";

export { computeScrollerExtensionDuration } from "./duration";
export const ScrollerExtension: ScriptOnlyExtension = {
  type: ExtensionType.ScriptOnly,
  extId: "scroller",
  shortName: "SCR",
  description: "Scroll the audience leaderboard.",
  execute: () => () => undefined,
  formatCueMessage: (event) => {
    const duration = getExtensionPayload<ScrollerExtensionPayload>(event)?.duration ?? 10;
    return h("span", [
      h("span", { class: css({ fontFamily: "mono", color: "fg.muted" }) }, "SCR"),
      " | Duration: ",
      h("span", { class: css({ fontFamily: "mono", color: "fg.success" }) }, `${duration}s`),
    ]);
  },
};
