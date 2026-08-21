<script setup lang="ts">
import { css } from "@styled-system/css";

import { CUE_CONFIG, type Cue } from "./cue";const props = defineProps<{ cue: Cue }>();
</script>

<template>
  <div :class="css({ display: 'flex', flexDirection: 'column', gap: '4', alignItems: 'start' })">
    <div :class="css({ fontSize: CUE_CONFIG[props.cue].headingSize, fontWeight: 'bold' })">
      {{ CUE_CONFIG[props.cue].label }}
    </div>
    <span
      :class="css({ fontSize: CUE_CONFIG[props.cue].contentSize, fontFamily: 'mono', textTransform: 'uppercase', overflowWrap: 'break-word', lineHeight: '1.6' })"
    >
      <slot />
    </span>
  </div>
</template>
