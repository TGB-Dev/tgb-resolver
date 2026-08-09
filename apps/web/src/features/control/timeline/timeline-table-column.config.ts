import { type GridTableColumnConfig, gridTableTemplate } from "@/features/shared/ui/grid-table";

const TIMELINE_TABLE_COLUMNS_CONFIG: Record<string, GridTableColumnConfig> = {
  id: {
    minW: "5ch",
    maxW: "5ch",
  },
  type: {
    minW: "4ch",
    maxW: "4ch",
  },
  name: {
    minW: "30ch",
  },
  problem: {
    minW: "5ch",
  },
  newScore: {
    minW: "7ch",
    maxW: "7ch",
  },
  newRank: {
    minW: "6ch",
    maxW: "6ch",
  },
  durationSeconds: {
    minW: "4ch",
    maxW: "4ch",
  },
  triggerOffsetSeconds: {
    minW: "6ch",
    maxW: "6ch",
  },
  requireManualInteraction: {
    minW: "5ch",
    maxW: "5ch",
  },
  dragHandle: {
    minW: "3ch",
    maxW: "3ch",
  },
};

export const TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS = gridTableTemplate(
  TIMELINE_TABLE_COLUMNS_CONFIG,
);

const { dragHandle: _dragHandle, ...TIMELINE_TABLE_STATIC_COLUMNS } = TIMELINE_TABLE_COLUMNS_CONFIG;

export const TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS_STATIC = gridTableTemplate(
  TIMELINE_TABLE_STATIC_COLUMNS,
);
