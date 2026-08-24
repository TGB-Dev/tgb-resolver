<script setup lang="ts">
import { Copy } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, code } from "@styled-system/recipes";
import { useClipboard } from "@vueuse/core";
import { computed } from "vue";

const props = defineProps<{ error: Error }>();

const errorJson = computed(() =>
  JSON.stringify(
    {
      name: props.error.name,
      message: props.error.message,
      stack: props.error.stack,
    },
    null,
    2,
  ),
);

const { copy, copied } = useClipboard({ source: errorJson });

const stackClass = cx(
  code(),
  css({ display: "block", whiteSpace: "pre-wrap", p: 3, maxHeight: "24rem", overflowY: "auto" }),
);
</script>

<template>
  <div
    :class="
      css({
        display: 'flex',
        flexDirection: 'column',
        minH: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bg: 'bg.subtle',
        padding: 6,
      })
    "
  >
    <div
      :class="
        css({
          w: 'full',
          maxWidth: '4xl',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderRadius: 'md',
          bg: 'bg.panel',
          padding: 6,
          boxShadow: 'md',
          borderWidth: 1,
          borderColor: 'border.error',
        })
      "
    >
      <div :class="css({ display: 'flex', flexDirection: 'column', gap: 1 })">
        <p :class="css({ fontSize: 'lg', fontWeight: 'medium', color: 'fg.error' })">Error</p>
        <p :class="css({ fontSize: 'sm', color: 'fg.muted' })">
          Please retry or contact support if the issue persists. You can copy the error details
          below for reference.
        </p>
      </div>

      <div :class="css({ display: 'flex', flexDirection: 'column', gap: 2 })">
        <button
          type="button"
          :class="
            cx(
              button({ size: 'xs', variant: 'surface' }),
              css({ colorPalette: 'gray', w: 'fit-content' }),
            )
          "
          @click="copy()"
        >
          <Copy :size="12" aria-hidden />
          {{ copied ? "Copied" : "Copy Error" }}
        </button>

        <p :class="css({ fontSize: 'sm', fontWeight: 'bold', color: 'fg' })">
          {{ error.name }}
        </p>
        <pre :class="stackClass">{{ error.message }}</pre>
        <pre
          v-if="error.stack"
          :class="cx(stackClass, css({ fontSize: 'xs', maxHeight: '16rem' }))"
          >{{ error.stack }}</pre
        >      </div>
    </div>
  </div>
</template>
