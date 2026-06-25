import { Button, Grid, HStack } from "@chakra-ui/react";
import { FILE_EXTENSION } from "@tgb-resolver/contracts";
import { Blocks, FileDown, FileUp, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useControlStore } from "@/stores/control.store";
import { ControlTimelineTable } from "../timeline/timeline-table";

export function ControlTimelinePanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optimizeCurrentShow = useControlStore((state) => state.optimizeCurrentShow);
  const clearCurrentShow = useControlStore((state) => state.clearCurrentShow);
  const importShowFile = useControlStore((state) => state.importShowFile);
  const exportCurrentShow = useControlStore((state) => state.exportCurrentShow);

  return (
    <Grid templateRows="1fr auto" h="full">
      <ControlTimelineTable />
      <input
        ref={fileInputRef}
        type="file"
        accept={`.xml,${FILE_EXTENSION}`}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importShowFile(file);
          }
          event.currentTarget.value = "";
        }}
      />

      {/* TODO: add a "jump to current" button, and don't automatically jump on scrolled away */}
      {/* Unless the current cell is in view (manually or automatically */}
      <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
        <Button onClick={() => void exportCurrentShow()}>
          <FileDown />
          Save
        </Button>

        <Button onClick={() => fileInputRef.current?.click()}>
          <FileUp />
          Load
        </Button>

        <Button onClick={optimizeCurrentShow}>
          <Blocks />
          Optimize
        </Button>

        <Button colorPalette="red" variant="outline" onClick={clearCurrentShow}>
          <Trash2 />
          Clear
        </Button>
      </HStack>
    </Grid>
  );
}
