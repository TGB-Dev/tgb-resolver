<script setup lang="ts">
import { Copy } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { ref } from "vue";

const props = defineProps<{ error: Error }>();

const isCopied = ref(false);

async function handleCopyError() {
  const errorData = {
    name: props.error.name,
    message: props.error.message,
    stack: props.error.stack,
  };
  await navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
  isCopied.value = true;
  setTimeout(() => (isCopied.value = false), 2000);
}

const stackClass = css({
  margin: 0,
  padding: 3,
  borderWidth: 1,
  borderRadius: "sm",
  bg: "bg.subtle",
  fontFamily: "mono",
  fontSize: "sm",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  overflow: "auto",
  maxHeight: "24rem",
});

const copyClass = css({
  display: "inline-flex",
  alignItems: "center",
  gap: 1,
  width: "fit-content",
  paddingInline: 2,
  paddingBlock: 0.5,
  borderWidth: 1,
  borderRadius: "sm",
  bg: "bg.subtle",
  color: "fg",
  fontSize: "xs",
  cursor: "pointer",
  transition: "background 0.15s ease",
  _hover: { bg: "bg.muted" },
});
</script>

<template>
  <div
    :class="
      css({
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
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
          width: 'full',
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
        <button type="button" :class="copyClass" @click="handleCopyError">
          <Copy :size="12" aria-hidden />
          {{ isCopied ? "Copied" : "Copy Error" }}
        </button>

        <p :class="css({ fontSize: 'sm', fontWeight: 'bold', color: 'fg' })">
          {{ error.name }}
        </p>
        <pre :class="stackClass">{{ error.message }}</pre>
        <pre v-if="error.stack" :class="cx(css({ fontSize: 'xs', maxHeight: '16rem' }), stackClass)">{{
          error.stack
        }}</pre>
      </div>
    </div>
  </div>
</template>
