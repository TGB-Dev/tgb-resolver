import type { Ref } from "vue";

export enum FloatingPanelType {
  ImportShow = "import-show",
  InspectShow = "inspect-show",
  ExtensionConfig = "extension-config",
  CreateEvent = "create-event",
}

export interface FloatingPanelHandle {
  readonly id: string;
  readonly type: FloatingPanelType;
  readonly title: Ref<string>;
  readonly props: Ref<Record<string, unknown>>;
  readonly result: Promise<boolean>;
  isDirty: Ref<boolean>;
  isSaving: Ref<boolean>;
  setTitle(title: string): void;
  setDirty(dirty: boolean): void;
  setSaving(saving: boolean): void;
  requestClose(reason?: "close" | "replace"): Promise<boolean>;
  close(accepted: boolean): void;
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
