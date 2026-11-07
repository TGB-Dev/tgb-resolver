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

/** Tab order for the main panel, shared by the default layout and reorders. */
export const CONTROL_VIEW_ORDER: readonly ControlViewType[] = [
  ControlViewType.Preview,
  ControlViewType.Assets,
  ControlViewType.Cue,
  ControlViewType.Info,
  ControlViewType.Settings,
  ControlViewType.Auth,
];

export const EDIT_ONLY_VIEWS: readonly ControlViewType[] = [
  ControlViewType.Preview,
  ControlViewType.Assets,
  ControlViewType.Info,
  ControlViewType.Settings,
];

export const CONTROL_VIEW_BY_ID: Record<string, ControlViewType> = Object.fromEntries(
  Object.values(ControlViewType).map((type) => [CONTROL_VIEW_IDS[type], type]),
);

/** The timeline starts with this share of the workspace width (45/55 split). */
export const INITIAL_STAGE_SHARE = 0.55;

/** The timeline keeps at least this share of the workspace width. */
export const MIN_STAGE_SHARE = 0.4;

export function stageMinimumWidth(totalWidth: number): number {
  return Math.round(totalWidth * MIN_STAGE_SHARE);
}
