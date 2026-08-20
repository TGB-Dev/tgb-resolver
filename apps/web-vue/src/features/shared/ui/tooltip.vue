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
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    showArrow?: boolean;
    disabled?: boolean;
    content: string;
    contentProps?: TooltipContentBaseProps;
  }>(),
  { showArrow: false, disabled: false, contentProps: undefined },
);

const rootProps = computed(() => {
  const { showArrow: _showArrow, disabled: _disabled, content: _content, contentProps: _contentProps, ...rest } =
    props;
  return rest;
});
</script>

<template>
  <TooltipRoot v-if="!disabled" v-bind="rootProps">
    <TooltipTrigger asChild>
      <slot />
    </TooltipTrigger>
    <TooltipPositioner>
      <TooltipContent v-bind="contentProps">
        <TooltipArrow v-if="showArrow">
          <TooltipArrowTip />
        </TooltipArrow>
        {{ content }}
      </TooltipContent>
    </TooltipPositioner>
  </TooltipRoot>
  <slot v-else />
</template>