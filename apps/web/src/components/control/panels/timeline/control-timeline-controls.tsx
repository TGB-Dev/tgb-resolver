import { Button, HStack, Show } from "@chakra-ui/react";
import { FILE_EXTENSION } from "@tgb-resolver/contracts";
import { useAtomValue, useSetAtom } from "jotai";
import { Blocks, FileDown, FileUp, Trash2 } from "lucide-react";
import { useRef } from "react";

import {
  clearCurrentShowAtom,
  controlCanMutateAtom,
  controlIsLiveAtom,
  exportCurrentShowAtom,
  importShowFileAtom,
  optimizeCurrentShowAtom,
} from "@/state/control";

export function ControlTimelineControls() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optimizeCurrentShow = useSetAtom(optimizeCurrentShowAtom);
  const clearCurrentShow = useSetAtom(clearCurrentShowAtom);
  const importShowFile = useSetAtom(importShowFileAtom);
  const exportCurrentShow = useSetAtom(exportCurrentShowAtom);
  const isLive = useAtomValue(controlIsLiveAtom);
  const canMutate = useAtomValue(controlCanMutateAtom);

  return (
    <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
      {/* TODO: add a "jump to current" button, and don't automatically jump on scrolled away */}
      {/* Unless the current cell is in view (manually or automatically */}
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
      <Show when={!isLive}>
        <Button onClick={() => void exportCurrentShow()} disabled={!canMutate}>
          <FileDown />
          Save
        </Button>

        <Button onClick={() => fileInputRef.current?.click()} disabled={!canMutate}>
          <FileUp />
          Load
        </Button>

        <Button onClick={optimizeCurrentShow} disabled={!canMutate}>
          <Blocks />
          Optimize
        </Button>

        <Button
          colorPalette="red"
          variant="outline"
          onClick={clearCurrentShow}
          disabled={!canMutate}
        >
          <Trash2 />
          Clear
        </Button>
      </Show>
    </HStack>
  );
}
