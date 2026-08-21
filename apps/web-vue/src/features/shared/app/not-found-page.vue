<script setup lang="ts">
import { css } from "@styled-system/css";</script>

<template>
  <div :class="css({ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', gap: '2', bg: 'bg.subtle', p: '6' })">
    <div :class="css({ fontSize: 'lg', fontWeight: 'medium', color: 'fg' })">
      404 <span :class="css({ color: 'fg.muted', mx: '2' })">|</span> Not found
    </div>

    <div :class="css({ fontSize: 'sm', color: 'fg.muted' })">
      This page is not available or does not exist. Please check the URL or return to the
      homepage.
    </div>
  </div>
</template>
