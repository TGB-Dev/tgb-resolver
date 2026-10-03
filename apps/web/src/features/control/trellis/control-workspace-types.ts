export enum ControlViewType {
  Preview = "preview",
  Assets = "assets",
  Cue = "cue",
  Info = "info",
  Settings = "settings",
  Auth = "auth",
  Timeline = "timeline",
}

export const CONTROL_VIEW_IDS: Record<ControlViewType, string> = {
  [ControlViewType.Preview]: "view-preview",
  [ControlViewType.Assets]: "view-assets",
  [ControlViewType.Cue]: "view-cue",
  [ControlViewType.Info]: "view-info",
  [ControlViewType.Settings]: "view-settings",
  [ControlViewType.Auth]: "view-auth",
  [ControlViewType.Timeline]: "view-timeline",
};

export const CONTROL_VIEW_TITLES: Record<ControlViewType, string> = {
  [ControlViewType.Preview]: "Preview",
  [ControlViewType.Assets]: "Assets",
  [ControlViewType.Cue]: "Cue",
  [ControlViewType.Info]: "Info",
  [ControlViewType.Settings]: "Settings",
  [ControlViewType.Auth]: "Auth",
  [ControlViewType.Timeline]: "Timeline",
};

export const EDIT_ONLY_VIEWS: readonly ControlViewType[] = [
  ControlViewType.Preview,
  ControlViewType.Assets,
  ControlViewType.Info,
  ControlViewType.Settings,
];

export const CONTROL_WORKSPACE_STORAGE_KEY = "tgb-control-workspace";
export const CONTROL_WORKSPACE_VERSION = 1;
