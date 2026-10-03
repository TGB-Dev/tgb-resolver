import { layout as L, type ViewTypes } from "@danfessler/trellis";
import { Images, Info, Lock, Logs, ScanEye, Settings, Timeline } from "@lucide/vue";

import ControlMainAssetsTab from "@/features/control/panels/main/tabs/control-main-assets-tab.vue";
import ControlMainAuthTab from "@/features/control/panels/main/tabs/control-main-auth-tab.vue";
import ControlMainCueTab from "@/features/control/panels/main/tabs/control-main-cue-tab.vue";
import ControlMainInfoTab from "@/features/control/panels/main/tabs/control-main-info-tab.vue";
import ControlMainPreviewTab from "@/features/control/panels/main/tabs/control-main-preview-tab.vue";
import ControlMainSettingsTab from "@/features/control/panels/main/tabs/control-main-settings-tab.vue";

import ControlTimelineView from "./control-timeline-view.vue";
import { CONTROL_VIEW_IDS, CONTROL_VIEW_TITLES, ControlViewType } from "./control-workspace-types";
import { mountVueView } from "./mount-vue-view";

export function buildControlViewTypes(): ViewTypes {
  return {
    [ControlViewType.Preview]: {
      title: CONTROL_VIEW_TITLES[ControlViewType.Preview],
      singleton: true,
      allow: { stage: false },
      mount: mountVueView(ControlMainPreviewTab, ScanEye),
    },
    [ControlViewType.Assets]: {
      title: CONTROL_VIEW_TITLES[ControlViewType.Assets],
      singleton: true,
      allow: { stage: false },
      mount: mountVueView(ControlMainAssetsTab, Images),
    },
    [ControlViewType.Cue]: {
      title: CONTROL_VIEW_TITLES[ControlViewType.Cue],
      singleton: true,
      allow: { stage: false },
      mount: mountVueView(ControlMainCueTab, Logs),
    },
    [ControlViewType.Info]: {
      title: CONTROL_VIEW_TITLES[ControlViewType.Info],
      singleton: true,
      allow: { stage: false },
      mount: mountVueView(ControlMainInfoTab, Info),
    },
    [ControlViewType.Settings]: {
      title: CONTROL_VIEW_TITLES[ControlViewType.Settings],
      singleton: true,
      allow: { stage: false },
      mount: mountVueView(ControlMainSettingsTab, Settings),
    },
    [ControlViewType.Auth]: {
      title: CONTROL_VIEW_TITLES[ControlViewType.Auth],
      singleton: true,
      allow: { stage: false },
      mount: mountVueView(ControlMainAuthTab, Lock),
    },
    [ControlViewType.Timeline]: {
      title: CONTROL_VIEW_TITLES[ControlViewType.Timeline],
      singleton: true,
      closable: false,
      placement: "stage",
      mount: mountVueView(ControlTimelineView, Timeline),
    },
  };
}

export function buildControlDefaultLayout() {
  return L.row(
    [
      L.panel(
        { id: "panel-main", selected: 0 },
        L.view(ControlViewType.Preview, { id: CONTROL_VIEW_IDS[ControlViewType.Preview] }),
        L.view(ControlViewType.Assets, { id: CONTROL_VIEW_IDS[ControlViewType.Assets] }),
        L.view(ControlViewType.Cue, { id: CONTROL_VIEW_IDS[ControlViewType.Cue] }),
        L.view(ControlViewType.Info, { id: CONTROL_VIEW_IDS[ControlViewType.Info] }),
        L.view(ControlViewType.Settings, { id: CONTROL_VIEW_IDS[ControlViewType.Settings] }),
        L.view(ControlViewType.Auth, { id: CONTROL_VIEW_IDS[ControlViewType.Auth] }),
      ),
      L.stage(
        L.view(ControlViewType.Timeline, { id: CONTROL_VIEW_IDS[ControlViewType.Timeline] }),
        {
          id: "stage",
        },
      ),
    ],
    [45, 55],
  );
}

export const CONTROL_WORKSPACE_TOKENS: Record<string, string> = {
  "--trellis-font": "var(--fonts-body)",
  "--trellis-bg": "var(--colors-bg-muted)",
  "--trellis-panel": "var(--colors-bg-panel)",
  "--trellis-stage": "var(--colors-bg)",
  "--trellis-tabbar": "var(--colors-bg-subtle)",
  "--trellis-tab-active": "var(--colors-bg-panel)",
  "--trellis-tab-hover": "var(--colors-bg-muted)",
  "--trellis-text": "var(--colors-fg)",
  "--trellis-text-muted": "var(--colors-fg-muted)",
  "--trellis-border": "var(--colors-border)",
  "--trellis-accent": "var(--colors-blue-500)",
  "--trellis-accent-contrast": "var(--colors-white)",
  "--trellis-menu": "var(--colors-bg-panel)",
  "--trellis-menu-hover": "var(--colors-bg-muted)",
  "--trellis-radius": "var(--radii-l2)",
  "--trellis-tab-radius": "var(--radii-l1)",
};
