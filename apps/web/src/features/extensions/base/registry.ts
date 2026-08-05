import type { RuntimeFormDefinition } from "@tgb-form/core";

import { ImageExtension } from "../image";
import { MediaExtension } from "../media";
import type { Extension } from "./types";

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

export const extensionRegistry = new ExtensionRegistry({
  [ImageExtension.extId]: ImageExtension,
  [MediaExtension.extId]: MediaExtension,
});
