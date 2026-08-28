import { defineStore } from "pinia";
import { ref } from "vue";

export enum ControlEditMainPanelTab {
  Preview = "preview",
  Assets = "assets",
  Cue = "cue",
  Info = "info",
  Settings = "settings",
}

export const useControlEditMainPanelStore = defineStore("control-edit-main-panel", () => {
  const activeTab = ref<ControlEditMainPanelTab>(ControlEditMainPanelTab.Preview);

  function setActiveTab(tab: ControlEditMainPanelTab): void {
    activeTab.value = tab;
  }

  return { activeTab, setActiveTab };
});
