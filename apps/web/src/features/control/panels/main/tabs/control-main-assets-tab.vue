<script setup lang="ts">
import { css } from "@styled-system/css";

import AssetsManager from "@/features/assets-manager/assets-manager.vue";</script>

<template>
  <div :class="css({ flex: 1, minH: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' })">
    <AssetsManager />
  </div>
</template>
