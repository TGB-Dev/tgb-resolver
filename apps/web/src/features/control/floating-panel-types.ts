import type { ComponentType } from "react";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-model";
import { ImportShowPanel } from "@/features/control/import-show-panel";
import { InspectShowPanel } from "@/features/control/inspect-show-panel";
import { ExtensionConfigPanel } from "@/features/extensions/config-panel";

export type FloatingPanelComponent = ComponentType<
  { panel: FloatingPanelHandle } & Record<string, unknown>
>;

export enum FloatingPanelType {
  ImportShow = "import-show",
  InspectShow = "inspect-show",
  ExtensionConfig = "extension-config",
}

export interface FloatingPanelConfig {
  size: { width: number; height: number };
  minSize?: { width: number; height: number };
  resizable?: boolean;
  maximizable?: boolean;
}

export const floatingPanelConfig: Record<FloatingPanelType, FloatingPanelConfig> = {
  [FloatingPanelType.ImportShow]: {
    size: { width: 560, height: 360 },
    resizable: true,
    maximizable: false,
  },
  [FloatingPanelType.InspectShow]: {
    size: { width: 720, height: 560 },
    minSize: { width: 420, height: 320 },
    resizable: true,
    maximizable: true,
  },
  [FloatingPanelType.ExtensionConfig]: {
    size: { width: 560, height: 480 },
    minSize: { width: 360, height: 320 },
    resizable: true,
    maximizable: true,
  },
};

export const floatingPanelComponents: Record<FloatingPanelType, FloatingPanelComponent> = {
  [FloatingPanelType.ImportShow]: ImportShowPanel as FloatingPanelComponent,
  [FloatingPanelType.InspectShow]: InspectShowPanel as FloatingPanelComponent,
  [FloatingPanelType.ExtensionConfig]: ExtensionConfigPanel as unknown as FloatingPanelComponent,
};
