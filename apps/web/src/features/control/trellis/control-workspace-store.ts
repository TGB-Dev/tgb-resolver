import type { WorkspaceHandle } from "@danfessler/trellis";
import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import {
  CONTROL_VIEW_IDS,
  type ControlViewType,
} from "@/features/control/trellis/control-workspace-types";

export const useControlWorkspaceStore = defineStore("control-workspace", () => {
  const handle = shallowRef<WorkspaceHandle | null>(null);
  const ready = ref(false);
  const workspace = computed(() => handle.value);

  function attach(next: WorkspaceHandle): void {
    handle.value = next;
    ready.value = true;
  }

  function detach(): void {
    handle.value = null;
    ready.value = false;
  }

  function focusView(type: ControlViewType): void {
    const current = handle.value;
    if (!current) return;
    const id = CONTROL_VIEW_IDS[type];
    if (current.view(id)) current.focus(id);
    else current.open(type, { id, focus: true });
  }

  return { handle, ready, workspace, attach, detach, focusView };
});
