import { defineForm, FieldDataType } from "@tgb-form/core";
import { createVueRendererRegistry } from "@tgb-form/vue";
import { mount } from "@vue/test-utils";
import { afterEach, expect, test } from "vitest";

import NumberRenderer from "@/features/extensions/components/number-renderer.vue";
import StringRenderer from "@/features/extensions/components/string-renderer.vue";
import ExtensionConfigForm from "@/features/extensions/extension-config-form.vue";

const renderers = createVueRendererRegistry({
  byType: {
    [FieldDataType.String]: StringRenderer,
    [FieldDataType.Number]: NumberRenderer,
  },
});

const definition = defineForm({
  fields: {
    url: { type: FieldDataType.String, label: "URL", defaultValue: "https://example.com" },
    speed: { type: FieldDataType.Number, label: "Speed", defaultValue: 10 },
  },
});

// Zag drives Ark inputs imperatively, so DOM values are unreliable under
// jsdom; assert against the TanStack form state instead.
interface ExposedForm {
  getValues(): Record<string, unknown>;
  isDirty(): boolean;
}

function exposed(wrapper: ReturnType<typeof mount>): ExposedForm {
  return wrapper.vm as unknown as ExposedForm;
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("baseline payload overrides definition defaults", () => {
  const wrapper = mount(ExtensionConfigForm, {
    props: {
      definition,
      baseline: { url: "https://edited.example", speed: 42 },
      renderers,
    },
  });
  expect(exposed(wrapper).getValues()).toMatchObject({ url: "https://edited.example", speed: 42 });
});

test("falls back to definition defaults without a baseline", () => {
  const wrapper = mount(ExtensionConfigForm, {
    props: { definition, renderers },
  });
  expect(exposed(wrapper).getValues()).toMatchObject({ url: "https://example.com", speed: 10 });
  expect(exposed(wrapper).isDirty()).toBe(false);
});
