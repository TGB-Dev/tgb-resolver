import { ref } from "vue";

export function createTimelineReorderState() {
  const rows = ref<number[] | null>(null);
  return {
    rows,
    set(nextRows: number[]) {
      rows.value = nextRows;
    },
    take() {
      const nextRows = rows.value;
      rows.value = null;
      return nextRows;
    },
  };
}
