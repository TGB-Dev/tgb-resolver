import type { InjectionKey, Ref } from "vue";

export interface SplitterPanelConfig {
  id: string;
  minSize?: number | string;
}

export interface SplitterContextValue {
  panels: Ref<readonly [SplitterPanelConfig, SplitterPanelConfig] | SplitterPanelConfig[]>;
  sizes: Ref<[number, number]>;
  rootId: string;
  rootEl: Ref<HTMLElement | null>;
  draggingId: Ref<string | null>;
  isDragging: Ref<boolean>;
  getPanelIndex: (id: string) => number;
  startDrag: (id: string, point: { x: number; y: number }) => void;
  updateKeyboardDelta: (id: string, delta: number) => void;
}

export const SplitterContextKey: InjectionKey<SplitterContextValue> = Symbol("splitter-context");
