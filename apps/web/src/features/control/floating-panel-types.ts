import type { ComponentType } from "react";

import { ImportShowPanel } from "@/features/control/import-show-panel";
import { InspectShowPanel } from "@/features/control/inspect-show-panel";

export enum FloatingPanelType {
  ImportShow = "import-show",
  InspectShow = "inspect-show",
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
};

export const floatingPanelComponents: Record<
  FloatingPanelType,
  ComponentType<Record<string, unknown>>
> = {
  [FloatingPanelType.ImportShow]: ImportShowPanel as ComponentType<Record<string, unknown>>,
  [FloatingPanelType.InspectShow]: InspectShowPanel as ComponentType<Record<string, unknown>>,
};
