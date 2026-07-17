import type { ComponentType } from "react";

import { ImportShowPanel } from "@/components/control/import-show-panel";

export enum FloatingPanelType {
  ImportShow = "import-show",
}

export const floatingPanelComponents: Record<
  FloatingPanelType,
  ComponentType<Record<string, unknown>>
> = {
  [FloatingPanelType.ImportShow]: ImportShowPanel as ComponentType<Record<string, unknown>>,
};
