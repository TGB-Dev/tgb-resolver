import { defineStore } from "pinia";
import { ref } from "vue";
export const useAssetsInteractionStore = defineStore("assets-interaction", () => {
  const clipboard = ref<string[]>([]);
  const dropTargetId = ref<string | null>(null);
  return { clipboard, dropTargetId };
});
