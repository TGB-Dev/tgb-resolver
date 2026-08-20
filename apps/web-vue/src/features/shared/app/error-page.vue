<script setup lang="ts">
import { Copy } from "@lucide/vue";
import { Box, Stack, VStack } from "@styled-system/jsx";
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
</script>

<template>
  <VStack minH="100dvh" justify="center" bg="bg.subtle" p="6">
    <Stack w="full" maxW="4xl" gap="4" rounded="md" bg="bg.panel" p="6" shadow="md" borderWidth="1" borderColor="border.error">
      <Stack gap="1">
        <Box fontSize="lg" fontWeight="medium" color="fg.error">
          Error
        </Box>
        <Box fontSize="sm" color="fg.muted">
          Please retry or contact support if the issue persists. You can copy the error details
          below for reference.
        </Box>
      </Stack>

      <Stack gap="2">
        <button type="button" class="_copy" @click="handleCopyError">
          <Copy class="_copy-icon" aria-hidden />
          {{ isCopied ? "Copied" : "Copy Error" }}
        </button>

        <Box fontSize="sm" fontWeight="bold" color="fg">
          {{ error.name }}
        </Box>
        <pre class="_stack">{{ error.message }}</pre>
        <pre v-if="error.stack" class="_stack _stack-xs">{{ error.stack }}</pre>
      </Stack>
    </Stack>
  </VStack>
</template>

<style scoped>
._copy {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  width: fit-content;
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--colors-border-muted);
  border-radius: var(--radii-sm);
  background: var(--colors-bg-subtle);
  color: var(--colors-fg);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

._copy:hover {
  background: var(--colors-bg-muted);
}

._copy-icon {
  width: 0.75rem;
  height: 0.75rem;
}

._stack {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--colors-border-muted);
  border-radius: var(--radii-sm);
  background: var(--colors-bg-subtle);
  font-family: var(--fonts-mono);
  font-size: 0.875rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: auto;
  max-height: 24rem;
}

._stack-xs {
  font-size: 0.75rem;
  max-height: 16rem;
}
</style>
