import { createVueRendererRegistry } from "@tgb-form/vue";
import { h } from "vue";

const TextRenderer = (props: { value: unknown }) => h("span", String(props.value ?? ""));
export const extensionRendererRegistry = createVueRendererRegistry({
  byName: { "asset-selector": TextRenderer, "select-input": TextRenderer },
});
