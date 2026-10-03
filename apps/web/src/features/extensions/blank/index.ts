import { css } from "@styled-system/css";
import { defineForm, FieldDataType } from "@tgb-form/core";
import { h } from "vue";

import { MotionDiv } from "@/lib/motion-factories";

import { ExtensionType, type WithVueComponentExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";

export interface BlankExtensionPayload extends Record<string, unknown> {
  color?: BlankColor;
}

export enum BlankColor {
  Background = "bg",
  Black = "black",
  White = "white",
}

const colorValue: Record<BlankColor, string> = {
  [BlankColor.Background]: "bg",
  [BlankColor.Black]: "black",
  [BlankColor.White]: "white",
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
          defaultValue: BlankColor.Background,
          label: "Color",
          description: "Background color of the blank overlay.",
          component: "select-input",
          props: {
            options: [
              { value: BlankColor.Background, label: "Theme background" },
              { value: BlankColor.Black, label: "Black" },
              { value: BlankColor.White, label: "White" },
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
      const color = payload?.color ?? BlankColor.Background;
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
