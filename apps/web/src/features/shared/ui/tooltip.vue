<script setup lang="ts">
import { Tooltip, type TooltipContentProps, type TooltipRootProps } from "@ark-ui/vue";
import { tooltip as tooltipRecipe } from "@styled-system/recipes";
import { useAttrs } from "vue";

// Deliberately NOT extending TooltipRootProps in defineProps: Vue casts every
// declared boolean prop that is absent to an explicit `false`, and forwarding
// them binds e.g. `open: false` onto Ark's Root - a controlled-closed machine
// whose tooltips can never open. Wrapper-specific props are declared here;
// anything else reaches Ark's Root through fallthrough $attrs untouched.
interface TooltipProps {
  showArrow?: boolean;
  disabled?: boolean;
  content?: string;
  openDelay?: number;
  /** Positioning options (placement, offset, ...); forwarded to Tooltip.Root. */
  positioning?: TooltipRootProps["positioning"];
  contentProps?: TooltipContentProps;
}

const props = withDefaults(defineProps<TooltipProps>(), {
  showArrow: false,
  disabled: false,
  content: "",
});

const attrs = useAttrs();
const classes = tooltipRecipe();

// Plain function, evaluated per render: v-bind must receive a plain object -
// spreading a ref would forward the ref's own internals instead.
function rootProps(): Record<string, unknown> {
  return {
    ...attrs,
    ...(props.openDelay !== undefined ? { openDelay: props.openDelay } : {}),
    ...(props.positioning !== undefined ? { positioning: props.positioning } : {}),
  };
}
</script>

<template>
  <Tooltip.Root v-if="!disabled" v-bind="rootProps()">
    <Tooltip.Trigger asChild>
      <slot />
    </Tooltip.Trigger>
    <!-- Teleport escapes overflow-clipping ancestors (scroll containers), so
         tooltips stay visible regardless of placement/flip settings. -->
    <Teleport to="body">
      <Tooltip.Positioner :class="classes.positioner">
        <Tooltip.Content :class="classes.content" v-bind="contentProps">
          <Tooltip.Arrow v-if="showArrow">
            <Tooltip.ArrowTip />
          </Tooltip.Arrow>
          <slot name="content">{{ content }}</slot>
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Teleport>
  </Tooltip.Root>
  <slot v-else />
</template>
