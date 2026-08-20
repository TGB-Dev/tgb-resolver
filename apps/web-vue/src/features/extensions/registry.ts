import type { TimelineTableItem } from "@tgb-resolver/realtime";

import type { Extension } from "./base/types";
import { BlankExtension } from "./blank";
import { ConfettiExtension } from "./confetti";
import { ImageExtension } from "./image";
import { MediaExtension } from "./media";
import { ScrollerExtension } from "./scroller";

export type { Extension } from "./base/types";

export interface ExtensionLike {
  extensionWithExtId(extId: string): Extension | undefined;
}

// Task 2.2 stub: the extension registry is populated in Phase 5. Until then,
// every lookup returns undefined and the picker shows an empty list.
const extensions: Record<string, Extension> = {
  blank: BlankExtension,
  confetti: ConfettiExtension,
  img: ImageExtension,
  media: MediaExtension,
  scroller: ScrollerExtension,
};
const emptyRegistry: ExtensionLike = {
  extensionWithExtId(extId) {
    return extensions[extId];
  },
};
export const extensionRegistry = emptyRegistry;

export function useExtensionRegistry(): ExtensionLike {
  return emptyRegistry;
}

export function formatCueMessageStub(
  extension: Extension | undefined,
  cue: TimelineTableItem,
): string | undefined {
  return extension?.extId ? `${cue.customName ?? cue.name}` : undefined;
}
