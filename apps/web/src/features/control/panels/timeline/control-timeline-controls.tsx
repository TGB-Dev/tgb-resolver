import { Button, HStack, Show } from "@chakra-ui/react";
import { Blocks, Crosshair, FileDown, FileUp, Trash2 } from "lucide-react";

import { floatingPanelModel } from "@/features/control/floating-panel-model";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import {
  useClearShowMutation,
  useControlCanMutate,
  useControlIsLive,
  useExportShowAction,
  useOptimizeShowMutation,
} from "@/features/control/hooks";
import { confirmActionModel } from "@/features/shared/confirm-action-model";

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
          onClick={async () => {
            const first = await confirmActionModel.confirmAction({
              title: "Clear Show",
              message:
                "Are you sure you want to clear the show from the server? This action can't be undone. Ensure you have backups.",
              confirmLabel: "Yes, Clear",
              cancelLabel: "Cancel",
            });
            if (!first) return;
            const second = await confirmActionModel.confirmAction({
              title: "FINAL WARNING",
              message: "THIS IS THE LAST WARNING! THIS CANNOT BE UNDONE! CONTINUE?",
              confirmLabel: "CLEAR EVERYTHING",
              cancelLabel: "Cancel",
            });
            if (second) clearCurrentShow.mutate();
          }}
          disabled={!canMutate}
        >
          <Trash2 />
          Clear
        </Button>
      </Show>
    </HStack>
  );
}
