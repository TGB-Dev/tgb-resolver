import type { ComponentType } from "react";

import { ImportShowPanel } from "@/components/control/import-show-panel";

export enum FloatingPanelType {
  ImportShow = "import-show",
}

/**
 * LUT registry: maps each panel type to its React component.
 * Components receive props via `{...props}` spread.
 * Add new entries here when creating panels.
 */
export const floatingPanelComponents: Record<
  FloatingPanelType,
  ComponentType<Record<string, unknown>>
> = {
  [FloatingPanelType.ImportShow]: ImportShowPanel as ComponentType<Record<string, unknown>>,
};
