<script setup lang="ts">
import {
  TooltipArrow,
  TooltipArrowTip,
  TooltipContent,
  type TooltipContentBaseProps,
  TooltipPositioner,
  TooltipRoot,
  TooltipTrigger,
} from "@ark-ui/vue";
import { tooltip } from "@styled-system/recipes";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    showArrow?: boolean;
    disabled?: boolean;
    content?: string;
    openDelay?: number;
    contentProps?: TooltipContentBaseProps;
  }>(),
  { showArrow: false, disabled: false, content: "", openDelay: undefined, contentProps: undefined },
);

const rootProps = computed(() => {
  const { showArrow: _showArrow, disabled: _disabled, content: _content, contentProps: _contentProps, ...rest } =
    props;
  return rest;
});
const classes = tooltip();
</script>

<template>
  <TooltipRoot v-if="!disabled" v-bind="rootProps">
    <TooltipTrigger asChild>
      <slot />
    </TooltipTrigger>
    <TooltipPositioner :class="classes.positioner">
      <TooltipContent :class="classes.content" v-bind="contentProps">
        <TooltipArrow v-if="showArrow">
          <TooltipArrowTip />
        </TooltipArrow>
        <slot name="content">{{ content }}</slot>
      </TooltipContent>
    </TooltipPositioner>
  </TooltipRoot>
  <slot v-else />
</template>
