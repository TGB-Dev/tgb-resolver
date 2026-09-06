<script setup lang="ts">
import { Editable } from "@ark-ui/vue";
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

// Ark's Preview renders the editable's own model value and ignores slot
// content, so the display value (e.g. signed trigger offset "+5") must BE
// the model. Commits hand the raw string back up; numeric consumers parse
// it with Number(), which accepts a leading "+".
const draft = ref(props.displayValue != null ? String(props.displayValue) : props.value);

watch(
  () => props.displayValue ?? props.value,
  (v) => {
    draft.value = String(v);
  },
);

const editableClasses = editable();
// Wrapper stretches to the column and carries alignment; padding lives ONLY
// on the preview/input - nesting it twice would offset the text from the
// column edge (breaks end-alignment vs the header).
// `minW: 0` lets the flex item shrink below its content width, otherwise a
// long value overflows the column once the input mounts.
const areaClass = computed(() =>
  css({
    w: "full",
    flex: "1",
    minW: 0,
    minH: "6",
    textAlign: props.textAlign,
    fontFamily: props.fontFamily,
  }),
);
// Matching `minH` on the input keeps the editing state pinned to the same box
// as the preview instead of floating vertically centered.
const fieldClass = css({
  px: "1",
  py: "0.5",
  minH: "6",
  rounded: "sm",
  cursor: "text",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
// The recipe renders the preview as `inline-flex`, which ignores `text-align`
// (the text becomes an anonymous flex item pinned to flex-start). Force block
// so end-alignment applies, matching React's plain-box non-editing state.
const previewClass = css({ display: "block" });

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
  <Editable.Root
    activation-mode="dblclick"
    submit-mode="both"
    :model-value="draft"
    :placeholder="placeholder"
    :class="cx(editableClasses.root, css({ w: 'full', alignItems: 'flex-start' }))"
    @value-change="handleValueChange"
    @value-commit="handleValueCommit"
    @dblclick.stop="() => {
      // stop propagation to the parent
    }"
  >
    <Editable.Area :class="cx(editableClasses.area, areaClass)">
      <Editable.Preview :class="cx(editableClasses.preview, fieldClass, previewClass)">
        {{ displayValue ?? value }}
      </Editable.Preview>
      <Editable.Input :class="cx(editableClasses.input, fieldClass, css({ bg: 'bg.panel' }))" />
    </Editable.Area>
  </Editable.Root>
</template>
