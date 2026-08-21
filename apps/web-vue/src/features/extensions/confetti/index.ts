import { defineForm, FieldDataType } from "@tgb-form/core";
import { h, onMounted } from "vue";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";
import { confettiPresets, fireConfetti, presetById } from "./presets";

export const ConfettiExtension: WithVueComponentExtension<{ preset?: string }> = {
  type: ExtensionType.WithVueComponent,
  extId: "confetti",
  shortName: "CNF",
  description: "Run confetti in the audience view.",
  configForm: defineForm(
    {
      fields: {
        preset: {
          type: FieldDataType.String,
          defaultValue: "cannon",
          label: "Preset",
          description: "Confetti animation style to run in the audience view.",
          component: "select-input",
          props: {
            options: confettiPresets.map((preset) => ({
              value: preset.id,
              label: preset.label,
            })),
          },
        },
      },
    },
    { validators: sharedValidatorRegistry },
  ),
  component: {
    name: "ConfettiExtension",
    setup: () => {
      onMounted(() => {
        fireConfetti();
      });
      return () => h("span");
    },
  },
  formatCueMessage: (event) => {
    const preset = getExtensionPayload<{ preset?: string }>(event)?.preset ?? "cannon";
    return h("span", `CNF | Preset: ${presetById(preset)?.label ?? preset}`);
  },
};
