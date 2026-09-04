import { defineStore } from "pinia";
import { ref } from "vue";

import { getServerNow } from "@/lib/realtime-client";

export const useControlNowStore = defineStore("control-now", () => {
  const now = ref(getServerNow());

  function setNow(value: number) {
    now.value = value;
  }

  return { now, setNow };
});
