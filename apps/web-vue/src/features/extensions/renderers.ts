import { createVueRendererRegistry } from "@tgb-form/vue";
import { defineComponent, h } from "vue";

import AssetSelectorRenderer from "./components/asset-selector-renderer.vue";

const TextRenderer = defineComponent({
  name: "TextRenderer",
  props: {
    value: { type: null, required: false },
  },
  setup(props) {
    return () => h("span", String(props.value ?? ""));
  },
});

export const extensionRendererRegistry = createVueRendererRegistry({
  byName: {
    "asset-selector": AssetSelectorRenderer,
    "select-input": TextRenderer,
  },
});
