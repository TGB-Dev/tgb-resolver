export enum FloatingPanelType {
  ImportShow = "import-show",
  InspectShow = "inspect-show",
  ExtensionConfig = "extension-config",
  CreateEvent = "create-event",
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
  [FloatingPanelType.CreateEvent]: {
    size: { width: 640, height: 480 },
    minSize: { width: 420, height: 320 },
    resizable: true,
    maximizable: true,
  },
};
