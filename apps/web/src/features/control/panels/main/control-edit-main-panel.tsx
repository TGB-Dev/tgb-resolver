import { Tabs } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Images, Info, Logs, ScanEye, Settings } from "lucide-react";

import { ControlMainAssetsTab } from "./tabs/control-main-assets-tab";
import { ControlMainCueTab } from "./tabs/control-main-cue-tab";
import { ControlMainInfoTab } from "./tabs/control-main-info-tab";
import { ControlMainPreviewTab } from "./tabs/control-main-preview-tab";
import { ControlMainSettingsTab } from "./tabs/control-main-settings-tab";

enum ControlEditMainPanelTabs {
  PREVIEW = "preview",
  ASSETS = "assets",
  CUE = "cue",
  INFO = "info",
  SETTINGS = "settings",
}

export function ControlEditMainPanel() {
  const tab = useSignal<ControlEditMainPanelTabs>(ControlEditMainPanelTabs.PREVIEW);

  useHotkeys([
    { hotkey: "Mod+1", callback: () => (tab.value = ControlEditMainPanelTabs.PREVIEW) },
    { hotkey: "Mod+2", callback: () => (tab.value = ControlEditMainPanelTabs.ASSETS) },
    { hotkey: "Mod+3", callback: () => (tab.value = ControlEditMainPanelTabs.CUE) },
    { hotkey: "Mod+4", callback: () => (tab.value = ControlEditMainPanelTabs.INFO) },
    { hotkey: "Mod+5", callback: () => (tab.value = ControlEditMainPanelTabs.SETTINGS) },
  ]);

  return (
    <Tabs.Root
      value={tab.value}
      onValueChange={(e) => {
        tab.value = e.value as ControlEditMainPanelTabs;
      }}
      h="full"
      minH={0}
      overflow="hidden"
      defaultValue="preview"
      display="grid"
      gridTemplateRows="auto 1fr"
    >
      <Tabs.List>
        <Tabs.Trigger value={ControlEditMainPanelTabs.PREVIEW}>
          <ScanEye />
          Preview
        </Tabs.Trigger>
        <Tabs.Trigger value={ControlEditMainPanelTabs.ASSETS}>
          <Images />
          Assets
        </Tabs.Trigger>
        <Tabs.Trigger value={ControlEditMainPanelTabs.CUE}>
          <Logs />
          Cue
        </Tabs.Trigger>
        <Tabs.Trigger value={ControlEditMainPanelTabs.INFO}>
          <Info />
          Info
        </Tabs.Trigger>
        <Tabs.Trigger value={ControlEditMainPanelTabs.SETTINGS}>
          <Settings />
          Settings
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value={ControlEditMainPanelTabs.PREVIEW} minH={0}>
        <ControlMainPreviewTab />
      </Tabs.Content>
      <Tabs.Content value={ControlEditMainPanelTabs.ASSETS}>
        <ControlMainAssetsTab />
      </Tabs.Content>
      <Tabs.Content value={ControlEditMainPanelTabs.CUE}>
        <ControlMainCueTab />
      </Tabs.Content>
      <Tabs.Content value={ControlEditMainPanelTabs.INFO}>
        <ControlMainInfoTab />
      </Tabs.Content>
      <Tabs.Content value={ControlEditMainPanelTabs.SETTINGS}>
        <ControlMainSettingsTab />
      </Tabs.Content>
    </Tabs.Root>
  );
}
