import { type GridTableColumnConfig, gridTableTemplate } from "@/components/ui/grid-table";

export const TIMELINE_TABLE_COLUMNS_CONFIG: Record<string, GridTableColumnConfig> = {
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
    minW: "4ch",
    maxW: "4ch",
  },
  requireManualInteraction: {
    minW: "5ch",
    maxW: "5ch",
  },
};

export const TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS = gridTableTemplate(
  TIMELINE_TABLE_COLUMNS_CONFIG,
);
