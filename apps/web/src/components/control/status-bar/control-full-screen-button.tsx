import { Button } from "@chakra-ui/react";
import { Fullscreen, Minimize } from "lucide-react";

import { fullscreenModel } from "@/models/full-screen";

export function ControlFullScreenButton() {
  const isFullscreen = fullscreenModel.isFullscreen.value;
  const toggle = fullscreenModel.toggleFullscreen;

  return (
    <Button variant="ghost" onClick={() => void toggle()} aspectRatio={1}>
      {isFullscreen ? <Minimize size={10} /> : <Fullscreen size={10} />}
    </Button>
  );
}
