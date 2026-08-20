<script setup lang="ts">
import {
  EditableArea,
  EditableInput,
  EditablePreview,
  EditableRoot,
} from "@ark-ui/vue";
import { Box } from "@styled-system/jsx";
import { editable } from "@styled-system/recipes";
import { ref, watch } from "vue";

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

const editing = ref(false);
const draft = ref(props.value);

watch(
  () => props.value,
  (v) => {
    draft.value = v;
  },
);

const editableClasses = editable();

function handleDoubleClickPreview(event: MouseEvent) {
  event.stopPropagation();
  draft.value = props.value;
  editing.value = true;
}

function handleValueChange(details: { value: string }) {
  draft.value = details.value;
}

function handleValueCommit(details: { value: string }) {
  if (details.value.trim().length === 0) {
    emit("blankCommit");
  } else {
    emit("commit", details.value);
  }
  editing.value = false;
}

function handleValueRevert() {
  editing.value = false;
}
</script>

<template>
  <Box
    v-if="!editing"
    px="1"
    py="0.5"
    minH="6"
    rounded="sm"
    :textAlign="textAlign"
    :fontFamily="fontFamily"
    cursor="text"
    overflow="hidden"
    textOverflow="ellipsis"
    whiteSpace="nowrap"
    @dblclick="handleDoubleClickPreview"
  >
    {{ displayValue ?? value }}
  </Box>

  <EditableRoot
    v-else
    :defaultEdit="true"
    submitMode="both"
    :value="draft"
    :placeholder="placeholder"
    :class="editableClasses.root"
    @dblclick.stop
    @value-change="handleValueChange"
    @value-commit="handleValueCommit"
    @value-revert="handleValueRevert"
  >
    <EditableArea :class="editableClasses.area">
      <EditablePreview
        :class="editableClasses.preview"
        px="1"
        py="0.5"
        minH="6"
        rounded="sm"
        :textAlign="textAlign"
        :fontFamily="fontFamily"
        cursor="text"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      />
      <EditableInput
        :class="editableClasses.input"
        px="1"
        py="0.5"
        minH="6"
        rounded="sm"
        :textAlign="textAlign"
        :fontFamily="fontFamily"
        bg="bg.panel"
      />
    </EditableArea>
  </EditableRoot>
</template>
