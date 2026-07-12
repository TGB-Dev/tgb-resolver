import { Button, HStack, Show } from "@chakra-ui/react";
import { Blocks, FileDown, FileUp, Trash2 } from "lucide-react";

import { ImportShowPanel } from "@/components/control/import-show-panel";
import {
  useClearShowMutation,
  useControlCanMutate,
  useControlIsLive,
  useExportShowAction,
  useOptimizeShowMutation,
} from "@/features/control/hooks";
import { FloatingPanelType, openFloatingPanel } from "@/state/floating-panel";

export function ControlTimelineControls() {
  const optimizeCurrentShow = useOptimizeShowMutation();
  const clearCurrentShow = useClearShowMutation();
  const exportCurrentShow = useExportShowAction();
  const isLive = useControlIsLive();
  const canMutate = useControlCanMutate();

  return (
    <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
      {/* TODO: add a "jump to current" button, and don't automatically jump on scrolled away */}
      {/* Unless the current cell is in view (manually or automatically */}
      <Show when={!isLive}>
        <Button onClick={() => void exportCurrentShow()} disabled={!canMutate}>
          <FileDown />
          Save
        </Button>

        <Button
          onClick={() =>
            void openFloatingPanel(FloatingPanelType.ImportShow, "Import show", <ImportShowPanel />)
          }
          disabled={!canMutate}
        >
          <FileUp />
          Load
        </Button>

        <Button onClick={() => optimizeCurrentShow.mutate()} disabled={!canMutate}>
          <Blocks />
          Optimize
        </Button>

        <Button
          colorPalette="red"
          variant="outline"
          onClick={() => clearCurrentShow.mutate()}
          disabled={!canMutate}
        >
          <Trash2 />
          Clear
        </Button>
      </Show>
    </HStack>
  );
}
