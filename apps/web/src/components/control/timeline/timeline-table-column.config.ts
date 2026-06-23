import type { TimelineTableItem } from "@tgb-resolver/contracts";

interface TimelineTableColumnConfigItem {
  minW?: string;
  maxW?: string;
}

export const TIMELINE_TABLE_COLUMNS_CONFIG: Record<
  keyof TimelineTableItem,
  TimelineTableColumnConfigItem
> = {
  id: {
    minW: "5ch",
    maxW: "5ch",
  },
  type: {
    minW: "5ch",
    maxW: "5ch",
  },
  name: {
    minW: "20ch",
  },
  problem: {
    minW: "5ch",
  },
  newScore: {
    minW: "6ch",
    maxW: "6ch",
  },
  newRank: {
    minW: "5ch",
    maxW: "5ch",
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

export const TIMELINE_TABLE_GRID_TEMPLATE_COLUMNS = Object.values(TIMELINE_TABLE_COLUMNS_CONFIG)
  .map(({ minW, maxW }) => {
    if (minW && maxW) {
      return `minmax(${minW}, ${maxW})`;
    } else if (minW) {
      return `minmax(${minW}, 1fr)`;
    } else if (maxW) {
      return `minmax(0, ${maxW})`;
    } else {
      return "1fr";
    }
  })
  .join(" ");
