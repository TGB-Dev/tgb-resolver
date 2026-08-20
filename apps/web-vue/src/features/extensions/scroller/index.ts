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
  formatCueMessage: (event) =>
    h(
      "span",
      `SCR | Duration: ${getExtensionPayload<ScrollerExtensionPayload>(event)?.duration ?? 10}s`,
    ),
};
