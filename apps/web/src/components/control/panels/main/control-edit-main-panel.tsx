import { Tabs } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Info, Logs, ScanEye, Settings } from "lucide-react";

import { ControlMainCueTab } from "./tabs/control-main-cue-tab";
import { ControlMainInfoTab } from "./tabs/control-main-info-tab";
import { ControlMainPreviewTab } from "./tabs/control-main-preview-tab";
import { ControlMainSettingsTab } from "./tabs/control-main-settings-tab";

enum ControlEditMainPanelTabs {
  PREVIEW = "preview",
  CUE = "cue",
  INFO = "info",
  SETTINGS = "settings",
}

export function ControlEditMainPanel() {
  const tab = useSignal<ControlEditMainPanelTabs>(ControlEditMainPanelTabs.PREVIEW);

  useHotkey("Mod+1", () => {
    tab.value = ControlEditMainPanelTabs.PREVIEW;
  });
  useHotkey("Mod+2", () => {
    tab.value = ControlEditMainPanelTabs.CUE;
  });
  useHotkey("Mod+3", () => {
    tab.value = ControlEditMainPanelTabs.INFO;
  });
  useHotkey("Mod+4", () => {
    tab.value = ControlEditMainPanelTabs.SETTINGS;
  });

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
      lazyMount
      unmountOnExit
      display="grid"
      gridTemplateRows="auto 1fr"
    >
      <Tabs.List>
        <Tabs.Trigger value="preview">
          <ScanEye />
          Preview
        </Tabs.Trigger>
        <Tabs.Trigger value="cue">
          <Logs />
          Cue
        </Tabs.Trigger>
        <Tabs.Trigger value="info">
          <Info />
          Info
        </Tabs.Trigger>
        <Tabs.Trigger value="settings">
          <Settings />
          Settings
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value={ControlEditMainPanelTabs.PREVIEW}>
        <ControlMainPreviewTab />
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
