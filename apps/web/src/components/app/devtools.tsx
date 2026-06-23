import { TanStackDevtools } from "@tanstack/react-devtools";
import { hotkeysDevtoolsPlugin } from "@tanstack/react-hotkeys-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import TanStackQueryDevtools from "@/integrations/tanstack-query/devtools";

export default function AppDevtools() {
  return (
    // biome-ignore lint/complexity/noUselessFragments: required, else, this will return a blank (), which Vite will fail to build
    <>
      <TanStackDevtools
        config={{
          position: "bottom-left",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
          TanStackQueryDevtools,
          hotkeysDevtoolsPlugin(),
        ]}
      />
    </>
  );
}
