import type { ViewTypeDefinition } from "@danfessler/trellis";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { type Component, createApp, h } from "vue";

import { pinia, queryClient } from "@/features/shared/app/providers";

export function mountVueView(
  component: Component,
  icon?: Component,
): NonNullable<ViewTypeDefinition["mount"]> {
  return (element, _view, parts) => {
    const app = createApp(component);
    app.use(pinia);
    app.use(VueQueryPlugin, { queryClient });
    app.mount(element);
    const iconApp = icon ? createApp({ render: () => h(icon) }) : null;
    iconApp?.mount(parts.icon);
    return () => {
      iconApp?.unmount();
      app.unmount();
    };
  };
}
