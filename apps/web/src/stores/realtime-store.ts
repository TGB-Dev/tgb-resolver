import { ShowConnectionStatus } from "@tgb-resolver/realtime";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useRealtimeStore = defineStore("realtime", () => {
  const connectionStatus = ref<ShowConnectionStatus>(ShowConnectionStatus.Connecting);
  const bigRefetching = ref(false);
  return { connectionStatus, bigRefetching };
});
