import type { RuntimeFormDefinition } from "@tgb-form/core";
import { defineForm, FieldDataType } from "@tgb-form/core";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { type Extension, ExtensionType } from "./types";

export class ExtensionRegistry {
  // Utilizing Record<K, V> for fast lookups than Map<K, V>.
  // The drawback is that if we need to manipulate the extension map, we must recreate it.
  // But, the need for middle manipulation is rare, so this tradeoff is acceptable.
  private extensions: Record<string, Extension>;

  constructor(extensions: Record<string, Extension>) {
    this.extensions = extensions;
  }

  get extensionList() {
    return Object.values(this.extensions);
  }

  extensionWithExtId(extId: string) {
    return this.extensions[extId];
  }

  configFormFor(extId: string): RuntimeFormDefinition | undefined {
    return this.extensionWithExtId(extId)?.configForm;
  }
}

const timerExtension: Extension = {
  extId: "timer",
  shortName: "Timer",
  description: "Runs a configurable countdown timer.",
  type: ExtensionType.ScriptOnly,
  configForm: defineForm({
    fields: {
      durationSeconds: {
        type: FieldDataType.Number,
        defaultValue: 10,
        label: "Duration (s)",
        description: "How long the timer runs.",
      },
      autoHide: {
        type: FieldDataType.Boolean,
        defaultValue: true,
        label: "Auto-hide",
        description: "Hide the timer when it finishes.",
      },
    },
  }),
  execute: () => () => {},
  formatCueMessage(event: TimelineTableItem) {
    return event.customName ?? event.name;
  },
};

export const extensionRegistry = new ExtensionRegistry({
  [timerExtension.extId]: timerExtension,
});
