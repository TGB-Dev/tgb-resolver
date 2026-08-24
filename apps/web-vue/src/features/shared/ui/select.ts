import { Select } from "@ark-ui/vue";
import { createStyleContext } from "@styled-system/jsx";
import { select } from "@styled-system/recipes";
import type { DefineComponent } from "vue";

/**
 * Panda's generated Vue factory props require framework internals (`$route`,
 * ...) that break strict template checking. This adapter restores normal
 * component typing; runtime behavior is untouched.
 */
function part<P = Record<string, unknown>>(component: unknown): DefineComponent<P> {
  return component as DefineComponent<P>;
}

/**
 * Styled Select parts wired to the generated Chakra preset `select` slot
 * recipe via Panda's style context - the same composition Chakra UI's React
 * `components/select` uses. Parts must be rendered inside `SelectRoot`.
 */
const selectStyles = createStyleContext(select);

export const SelectRoot = part(
  selectStyles.withProvider(Select.Root, "root", {
    defaultProps: { positioning: { sameWidth: true } },
  }),
);

export const SelectControl = part(selectStyles.withContext(Select.Control, "control"));

export const SelectTrigger = part(selectStyles.withContext(Select.Trigger, "trigger"));

export const SelectPositioner = part(selectStyles.withContext(Select.Positioner, "positioner"));

export const SelectContent = part(selectStyles.withContext(Select.Content, "content"));

export const SelectList = part(selectStyles.withContext(Select.List, "list"));

export const SelectValueText = part(selectStyles.withContext(Select.ValueText, "valueText"));

export const SelectItem = part(selectStyles.withContext(Select.Item, "item"));

export const SelectItemText = part(selectStyles.withContext(Select.ItemText, "itemText"));

export const SelectItemIndicator = part(
  selectStyles.withContext(Select.ItemIndicator, "itemIndicator"),
);

export const SelectIndicatorGroup = part(selectStyles.withContext("div", "indicatorGroup"));

export const SelectIndicator = part(selectStyles.withContext(Select.Indicator, "indicator"));

export const SelectHiddenSelect = Select.HiddenSelect;

export const SelectContext = Select.Context;
