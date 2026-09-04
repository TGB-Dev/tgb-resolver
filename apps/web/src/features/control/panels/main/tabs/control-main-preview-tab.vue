<script setup lang="ts">
import { css } from "@styled-system/css";

import Leaderboard from "@/features/leaderboard/leaderboard.vue";</script>

<template>
  <div :class="css({ h: 'full', overflowY: 'auto' })">
    <Leaderboard />
  </div>
</template>
