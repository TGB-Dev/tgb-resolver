import { defineForm, FieldDataType } from "@tgb-form/core";
import { h } from "vue";

import { ExtensionType, type WithVueComponentExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";

export const BlankExtension: WithVueComponentExtension = {
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
  component: { name: "BlankExtension", setup: () => () => h("span") },
  formatCueMessage: () => h("span", "BLK"),
};
