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
