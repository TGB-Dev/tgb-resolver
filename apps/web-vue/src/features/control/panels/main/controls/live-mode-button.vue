<script setup lang="ts">
import { Pen, Radio } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";
import { computed } from "vue";

import { useControlCanMutate, useControlIsLive, useToggleLiveModeMutation } from "@/features/control/composables/use-show";
import Tooltip from "@/features/shared/ui/tooltip.vue";

const toggleLiveMode = useToggleLiveModeMutation();
const isLive = useControlIsLive();
const canMutate = useControlCanMutate();

// aria-disabled instead of `disabled`: a natively disabled button swallows
// pointer events, which would keep the tooltip from ever opening.
const blocked = computed(() => !canMutate.value || toggleLiveMode.isPending.value);

function handleToggle() {
  if (blocked.value) return;
  toggleLiveMode.mutate();
}
</script>

<template>
  <Tooltip :content="isLive ? 'Switch to Edit Mode' : 'Switch to Live Mode'">
    <button
      type="button"
      :class="
        cx(
          button({ variant: isLive ? 'solid' : 'outline' }),
          css({ w: '48', colorPalette: isLive ? 'red' : undefined, _disabled: { opacity: 0.5, cursor: 'not-allowed', _hover: { bg: 'transparent' } } }),
        )
      "
      :aria-disabled="blocked || undefined"
      @click="handleToggle"
    >
      <Radio v-if="isLive" :size="16" aria-hidden />
      <Pen v-else :size="16" aria-hidden />
      <span>Current Mode: {{ isLive ? 'Live' : 'Edit' }}</span>
    </button>
  </Tooltip>
</template>
