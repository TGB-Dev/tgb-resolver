import { Button, Grid, HStack } from "@chakra-ui/react";
import { Blocks, FileDown, FileUp } from "lucide-react";
import { ControlTimelineTable } from "../timeline/timeline-table";

export function ControlTimelinePanel() {
  return (
    <Grid templateRows="1fr auto" h="full">
      <ControlTimelineTable />

      {/* TODO: add a "jump to current" button, and don't automatically jump on scrolled away */}
      {/* Unless the current cell is in view (manually or automatically */}
      <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
        <Button>
          <FileDown />
          Save
        </Button>

        <Button>
          <FileUp />
          Load
        </Button>

        <Button>
          <Blocks />
          Optimize
        </Button>
      </HStack>
    </Grid>
  );
}
