<script setup lang="ts">
import { css } from "@styled-system/css";

import ControlMainCueTab from "@/features/control/panels/main/tabs/control-main-cue-tab.vue";
</script>

<template>
  <div :class="css({ flex: 1 })">
    <ControlMainCueTab />
  </div>
</template>
