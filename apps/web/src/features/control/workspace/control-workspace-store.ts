import type { DockviewApi } from "dockview-vue";
import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import type { ControlViewType } from "@/features/control/workspace/control-workspace-types";
import { focusControlView } from "@/features/control/workspace/control-workspace-views";

export const useControlWorkspaceStore = defineStore("control-workspace", () => {
  const handle = shallowRef<DockviewApi | null>(null);
  const ready = ref(false);
  const workspace = computed(() => handle.value);

  function attach(next: DockviewApi): void {
    handle.value = next;
    ready.value = true;
  }

  function detach(): void {
    handle.value = null;
    ready.value = false;
  }

  function focusView(type: ControlViewType): void {
    const current = handle.value;
    if (current) focusControlView(current, type);
  }

  return { handle, ready, workspace, attach, detach, focusView };
});
