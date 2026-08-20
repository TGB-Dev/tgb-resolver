import type { TimelineTableItem } from "@tgb-resolver/realtime";

import type { Extension } from "./base/types";

export type { Extension } from "./base/types";

export interface ExtensionLike {
  extensionWithExtId(extId: string): Extension | undefined;
}

// Task 2.2 stub: the extension registry is populated in Phase 5. Until then,
// every lookup returns undefined and the picker shows an empty list.
const emptyRegistry: ExtensionLike = {
  extensionWithExtId(_extId: string): Extension | undefined {
    return undefined;
  },
};

export function useExtensionRegistry(): ExtensionLike {
  return emptyRegistry;
}

export function formatCueMessageStub(
  extension: Extension | undefined,
  cue: TimelineTableItem,
): string | undefined {
  return extension?.extId ? `${cue.customName ?? cue.name}` : undefined;
}
