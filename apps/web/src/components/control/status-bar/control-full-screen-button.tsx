import { Button } from "@chakra-ui/react";
import { Fullscreen, Minimize } from "lucide-react";

import { useFullscreenStore } from "@/store/full-screen";

export function ControlFullScreenButton() {
  const isFullscreen = useFullscreenStore((s) => s.isFullscreen);
  const toggle = useFullscreenStore((s) => s.toggleFullscreen);

  return (
    <Button variant="ghost" onClick={() => void toggle()} aspectRatio={1}>
      {isFullscreen ? <Minimize size={10} /> : <Fullscreen size={10} />}
    </Button>
  );
}
