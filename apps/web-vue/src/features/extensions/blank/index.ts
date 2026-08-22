import { css } from "@styled-system/css";
import { defineForm, FieldDataType } from "@tgb-form/core";
import { h } from "vue";

import { MotionDiv } from "@/lib/motion-factories";

import { ExtensionType, type WithVueComponentExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";

export interface BlankExtensionPayload extends Record<string, unknown> {
  color?: "bg" | "black" | "white";
}

const colorValue: Record<NonNullable<BlankExtensionPayload["color"]>, string> = {
  bg: "bg",
  black: "black",
  white: "white",
};

export const BlankExtension: WithVueComponentExtension<BlankExtensionPayload> = {
  type: ExtensionType.WithVueComponent,
  extId: "blank",
  shortName: "BLK",
  description: "Blank audience event.",
  configForm: defineForm(
    {
      fields: {
        color: {
          type: FieldDataType.String,
          defaultValue: "bg",
          label: "Color",
          description: "Background color of the blank overlay.",
          component: "select-input",
          props: {
            options: [
              { value: "bg", label: "Theme background" },
              { value: "black", label: "Black" },
              { value: "white", label: "White" },
            ],
          },
        },
      },
    },
    { validators: sharedValidatorRegistry },
  ),
  component: {
    name: "BlankExtension",
    props: { payload: { type: Object, required: true } },
    setup: (props) => () => {
      const payload = props.payload as BlankExtensionPayload;
      const color = payload?.color ?? "bg";
      return h(MotionDiv, {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
        class: css({
          position: "absolute",
          inset: 0,
          zIndex: "dropdown",
          background: colorValue[color],
        }),
      });
    },
  },
  formatCueMessage: () => h("span", "BLK"),
};
