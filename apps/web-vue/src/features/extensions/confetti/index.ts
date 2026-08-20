import { h } from "vue";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
import { fireConfetti, presetById } from "./presets";
export const ConfettiExtension: WithVueComponentExtension<{ preset?: string }> = {
  type: ExtensionType.WithVueComponent,
  extId: "confetti",
  shortName: "CNF",
  description: "Run confetti in the audience view.",
  component: {
    name: "ConfettiExtension",
    setup: () => {
      fireConfetti();
      return () => h("span");
    },
  },
  formatCueMessage: (event) => {
    const preset = getExtensionPayload<{ preset?: string }>(event)?.preset ?? "cannon";
    return h("span", `CNF | Preset: ${presetById(preset)?.label ?? preset}`);
  },
};
