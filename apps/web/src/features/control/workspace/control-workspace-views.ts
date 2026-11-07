import type { DockviewApi, DockviewGroupPanel, IDockviewPanel } from "dockview-vue";

import {
  CONTROL_VIEW_IDS,
  CONTROL_VIEW_ORDER,
  CONTROL_VIEW_TITLES,
  ControlViewType,
  EDIT_ONLY_VIEWS,
} from "./control-workspace-types";

/** The group holding the main tabs. */
function findMainGroup(api: DockviewApi): DockviewGroupPanel | undefined {
  const timelineGroup = api.getPanel(CONTROL_VIEW_IDS[ControlViewType.Timeline])?.group;
  return api.groups.find((group) => group !== timelineGroup);
}

interface OpenControlViewOptions {
  group?: DockviewGroupPanel;
  inactive?: boolean;
}

function openControlView(
  api: DockviewApi,
  type: ControlViewType,
  options: OpenControlViewOptions = {},
): IDockviewPanel {
  const group = options.group ?? findMainGroup(api);
  return api.addPanel({
    id: CONTROL_VIEW_IDS[type],
    component: type,
    title: CONTROL_VIEW_TITLES[type],
    inactive: options.inactive ?? true,
    ...(group
      ? { position: { referenceGroup: group, direction: "within" as const } }
      : api.getPanel(CONTROL_VIEW_IDS[ControlViewType.Timeline])
        ? {
            position: {
              referencePanel: CONTROL_VIEW_IDS[ControlViewType.Timeline],
              direction: "left" as const,
            },
          }
        : {}),
  });
}

export function buildDefaultWorkspace(api: DockviewApi): void {
  const preview = openControlView(api, ControlViewType.Preview, { inactive: false });
  const group = preview.group;

  for (const type of CONTROL_VIEW_ORDER) {
    if (type === ControlViewType.Preview) continue;
    openControlView(api, type, { group, inactive: true });
  }

  api.addPanel({
    id: CONTROL_VIEW_IDS[ControlViewType.Timeline],
    component: ControlViewType.Timeline,
    title: CONTROL_VIEW_TITLES[ControlViewType.Timeline],
    inactive: true,
    position: { referenceGroup: group, direction: "right" },
  });
}

export function ensureMainViews(api: DockviewApi): void {
  for (const type of EDIT_ONLY_VIEWS) {
    if (!api.getPanel(CONTROL_VIEW_IDS[type])) {
      openControlView(api, type, { group: findMainGroup(api), inactive: true });
    }
  }
}

export function closeEditOnlyViews(api: DockviewApi): void {
  for (const type of EDIT_ONLY_VIEWS) {
    api.getPanel(CONTROL_VIEW_IDS[type])?.api.close();
  }
}

export function focusControlView(api: DockviewApi, type: ControlViewType): void {
  const existing = api.getPanel(CONTROL_VIEW_IDS[type]);
  if (existing) {
    existing.api.setActive();
    return;
  }
  openControlView(api, type, { inactive: false });
}
