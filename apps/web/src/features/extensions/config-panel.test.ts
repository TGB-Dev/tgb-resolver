import { TimelineEventType } from "@tgb-resolver/contracts";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { expect, test } from "vitest";
import { nextTick, ref } from "vue";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { useShowStore } from "@/stores/show-store";

import ConfigPanel from "./config-panel.vue";

function makePanel(eventId: number): FloatingPanelHandle {
  return {
    id: "p1",
    type: FloatingPanelType.ExtensionConfig,
    title: ref("Edit"),
    props: ref({ eventId }),
    result: Promise.resolve(true),
    isDirty: ref(false),
    isSaving: ref(false),
    setTitle: () => {},
    setDirty: () => {},
    setSaving: () => {},
    requestClose: async () => true,
    close: () => {},
  };
}

function seed(store: ReturnType<typeof useShowStore>, extPayload?: Record<string, unknown>) {
  store.showEvents = {
    7: {
      id: 7,
      position: 1,
      type: TimelineEventType.CUS,
      payload: { extId: "scroller", ...(extPayload ? { extPayload } : {}) },
    },
  } as never;
}

// React parity: the form only mounts once the event exists (it seeds at
// setup), so a payload delivered together with the event must be restored.
test("restores payload present when the event syncs in", async () => {
  const pinia = createPinia();
  const wrapper = mount(ConfigPanel, {
    props: { panel: makePanel(7) },
    global: { plugins: [pinia] },
    attachTo: document.body,
  });
  const store = useShowStore(pinia);
  seed(store, { duration: 42 });
  await nextTick();
  await nextTick();

  const exposed = wrapper.getComponent({ name: "ExtensionConfigForm" });
  interface ExposedForm {
    getValues(): Record<string, unknown>;
    isDirty(): boolean;
  }
  const form = exposed.vm as unknown as ExposedForm;
  expect(form.getValues()).toMatchObject({ duration: 42 });
  expect(form.isDirty()).toBe(false);
});
