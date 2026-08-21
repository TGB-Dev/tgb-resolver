import { css } from "@styled-system/css";
import { defineForm, FieldDataType } from "@tgb-form/core";
import { h } from "vue";

import { ExtensionType, getExtensionPayload, type ScriptOnlyExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";
import type { ScrollerExtensionPayload } from "./duration";

export { computeScrollerExtensionDuration } from "./duration";

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

export const ScrollerExtension: ScriptOnlyExtension = {
  type: ExtensionType.ScriptOnly,
  extId: "scroller",
  shortName: "SCR",
  description: "Scroll the audience leaderboard.",
  configForm: formSchema,
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
