import { Button } from "@chakra-ui/react";
import { Fullscreen, Minimize } from "lucide-react";
import { useFullScreenStore } from "@/stores/full-screen.store";

export function ControlFullScreenButton() {
  const isFullscreen = useFullScreenStore((state) => state.isFullscreen);
  const toggle = useFullScreenStore((state) => state.toggle);

  return (
    <Button variant="ghost" onClick={toggle} aspectRatio={1}>
      {isFullscreen ? <Minimize size={10} /> : <Fullscreen size={10} />}
    </Button>
  );
}
