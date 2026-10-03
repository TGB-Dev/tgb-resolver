import { VueQueryPlugin } from "@tanstack/vue-query";
import { type Component, createApp } from "vue";

import { pinia, queryClient } from "@/features/shared/app/providers";

export function mountVueView(component: Component): (element: HTMLElement) => () => void {
  return (element: HTMLElement) => {
    const app = createApp(component);
    app.use(pinia);
    app.use(VueQueryPlugin, { queryClient });
    app.mount(element);
    return () => app.unmount();
  };
}
