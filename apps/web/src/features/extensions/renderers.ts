import { FieldDataType } from "@tgb-form/core";
import { createVueRendererRegistry } from "@tgb-form/vue";

import AssetSelectorRenderer from "./components/asset-selector-renderer.vue";
import BooleanRenderer from "./components/boolean-renderer.vue";
import NumberRenderer from "./components/number-renderer.vue";
import SelectInput from "./components/select-input-renderer.vue";
import StringRenderer from "./components/string-renderer.vue";
import UnsupportedRenderer from "./components/unsupported-renderer.vue";

export const extensionRendererRegistry = createVueRendererRegistry({
  byName: {
    "asset-selector": AssetSelectorRenderer,
    "select-input": SelectInput,
  },
  byType: {
    [FieldDataType.String]: StringRenderer,
    [FieldDataType.Number]: NumberRenderer,
    [FieldDataType.Boolean]: BooleanRenderer,
    [FieldDataType.Object]: UnsupportedRenderer,
    [FieldDataType.Array]: UnsupportedRenderer,
  },
});
