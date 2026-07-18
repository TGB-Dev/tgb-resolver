import { Button, HStack, Show } from "@chakra-ui/react";
import { Blocks, Crosshair, FileDown, FileUp, Trash2 } from "lucide-react";

import {
  useClearShowMutation,
  useControlCanMutate,
  useControlIsLive,
  useExportShowAction,
  useOptimizeShowMutation,
} from "@/features/control/hooks";
import { floatingPanelModel } from "@/models/floating-panel";
import { FloatingPanelType } from "@/models/floating-panel-types";

interface ControlTimelineControlsProps {
  onJumpToCurrent?: () => void;
}

export function ControlTimelineControls({ onJumpToCurrent }: ControlTimelineControlsProps) {
  const optimizeCurrentShow = useOptimizeShowMutation();
  const clearCurrentShow = useClearShowMutation();
  const exportCurrentShow = useExportShowAction();
  const isLive = useControlIsLive();
  const canMutate = useControlCanMutate();
  const openFloatingPanel = floatingPanelModel.openFloatingPanel;

  return (
    <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
      <Show when={onJumpToCurrent !== undefined}>
        <Button onClick={onJumpToCurrent}>
          <Crosshair />
          To Current
        </Button>
      </Show>

      <Show when={!isLive}>
        <Button onClick={() => void exportCurrentShow()} disabled={!canMutate}>
          <FileDown />
          Save
        </Button>

        <Button
          onClick={() => void openFloatingPanel(FloatingPanelType.ImportShow, "Import show")}
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
