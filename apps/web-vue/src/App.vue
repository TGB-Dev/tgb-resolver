<script setup lang="ts">
import { Dialog } from "@ark-ui/vue";
import { XIcon } from "@lucide/vue";
import { button, dialog } from "@styled-system/recipes";

const styles = dialog();
</script>

<template>
  <Dialog.Root role="alertdialog">
    <Dialog.Trigger :class="button({ variant: 'solid' })">Open Dialog</Dialog.Trigger>
    <Teleport to="body">
      <Dialog.Backdrop :class="styles.backdrop" />
      <Dialog.Positioner :class="styles.positioner">
        <Dialog.Content :class="styles.content">
          <div :class="styles.header">
            <Dialog.Title :class="styles.title">Dialog Title</Dialog.Title>
          </div>
          <div :class="styles.body">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
          <div :class="styles.footer">
            <Dialog.CloseTrigger :class="button({ variant: 'outline' })">Cancel</Dialog.CloseTrigger>
            <button type="button" :class="button({ variant: 'solid' })">Save</button>
          </div>
          <Dialog.CloseTrigger :class="styles.closeTrigger">
            <XIcon />
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Teleport>
  </Dialog.Root>
</template>

<style scoped></style>
