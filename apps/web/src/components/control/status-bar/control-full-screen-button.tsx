import { Button } from "@chakra-ui/react";
import { useAtomValue, useSetAtom } from "jotai";
import { Fullscreen, Minimize } from "lucide-react";

import { isFullscreenAtom, toggleFullscreenAtom } from "@/state/full-screen";

export function ControlFullScreenButton() {
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const toggle = useSetAtom(toggleFullscreenAtom);

  return (
    <Button variant="ghost" onClick={() => void toggle()} aspectRatio={1}>
      {isFullscreen ? <Minimize size={10} /> : <Fullscreen size={10} />}
    </Button>
  );
}
