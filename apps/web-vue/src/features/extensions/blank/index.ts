import { h } from "vue";

import { ExtensionType, type WithVueComponentExtension } from "../base/types";
export const BlankExtension: WithVueComponentExtension = {
  type: ExtensionType.WithVueComponent,
  extId: "blank",
  shortName: "BLK",
  description: "Blank audience event.",
  component: { name: "BlankExtension", setup: () => () => h("span") },
  formatCueMessage: () => h("span", "BLK"),
};
