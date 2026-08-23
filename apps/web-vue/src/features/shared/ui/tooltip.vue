<script setup lang="ts">
import { Tooltip, type TooltipContentBaseProps, type TooltipRootProps } from "@ark-ui/vue";
import { tooltip } from "@styled-system/recipes";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    showArrow?: boolean;
    disabled?: boolean;
    content?: string;
    openDelay?: number;
    /** Ark positioning options (placement, offset, …); forwarded to Tooltip.Root. */
    positioning?: TooltipRootProps["positioning"];
    contentProps?: TooltipContentBaseProps;
  }>(),
  {
    showArrow: false,
    disabled: false,
    content: "",
    openDelay: undefined,
    positioning: undefined,
    contentProps: undefined,
  },
);

const rootProps = computed(() => {
  const { showArrow: _showArrow, disabled: _disabled, content: _content, contentProps: _contentProps, ...rest } =
    props;
  return rest;
});
const classes = tooltip();
</script>

<template>
  <Tooltip.Root v-if="!disabled" v-bind="rootProps">
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
