<script setup lang="ts">
import {
  EditableArea,
  EditableInput,
  EditablePreview,
  EditableRoot,
} from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { editable } from "@styled-system/recipes";
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    value: string;
    displayValue?: string | number;
    placeholder?: string;
    textAlign?: "start" | "end";
    fontFamily?: string;
  }>(),
  {
    displayValue: undefined,
    placeholder: undefined,
    textAlign: "start",
    fontFamily: undefined,
  },
);

const emit = defineEmits<{
  commit: [value: string];
  blankCommit: [];
}>();

const draft = ref(props.value);

watch(
  () => props.value,
  (v) => {
    draft.value = v;
  },
);

const editableClasses = editable();
const cellClass = computed(() =>
  css({
    px: "1",
    py: "0.5",
    minH: "6",
    rounded: "sm",
    textAlign: props.textAlign,
    fontFamily: props.fontFamily,
    cursor: "text",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
);

function handleValueChange(details: { value: string }) {
  draft.value = details.value;
}

function handleValueCommit(details: { value: string }) {
  if (details.value.trim().length === 0) {
    emit("blankCommit");
  } else {
    emit("commit", details.value);
  }
}
</script>

<template>
  <EditableRoot
    activation-mode="dblclick"
    submit-mode="both"
    :model-value="draft"
    :placeholder="placeholder"
    :class="editableClasses.root"
    @dblclick.stop
    @value-change="handleValueChange"
    @value-commit="handleValueCommit"
  >
    <EditableArea :class="editableClasses.area">
      <EditablePreview :class="cx(editableClasses.preview, cellClass)">
        {{ displayValue ?? value }}
      </EditablePreview>
      <EditableInput
        :class="cx(editableClasses.input, cellClass, css({ bg: 'bg.panel' }))"
      />
    </EditableArea>
  </EditableRoot>
</template>
