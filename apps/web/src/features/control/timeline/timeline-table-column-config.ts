import { gridTableTemplate } from "@/features/shared/ui/grid-table";

const columns = {
  id: { minW: "5ch", maxW: "5ch" },
  type: { minW: "4ch", maxW: "4ch" },
  name: { minW: "30ch" },
  problem: { minW: "5ch" },
  newScore: { minW: "7ch", maxW: "7ch" },
  newRank: { minW: "6ch", maxW: "6ch" },
  durationSeconds: { minW: "6ch", maxW: "6ch" },
  triggerOffsetSeconds: { minW: "8ch", maxW: "8ch" },
  requireManualInteraction: { minW: "5ch", maxW: "5ch" },
  dragHandle: { minW: "3ch", maxW: "3ch" },
} as const;
export const timelineTableGridTemplateColumns = gridTableTemplate(columns);
export const timelineTableGridTemplateColumnsStatic = gridTableTemplate(
  Object.fromEntries(Object.entries(columns).filter(([key]) => key !== "dragHandle")),
);
