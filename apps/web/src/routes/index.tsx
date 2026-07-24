import { createFileRoute } from "@tanstack/react-router";

import { Resolve } from "@/components/resolve/resolve";
import { ControlRealtimeProvider } from "@/features/control/realtime-provider";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <ControlRealtimeProvider>
      <Resolve />
    </ControlRealtimeProvider>
  );
}
