import { h } from "vue";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
export interface MediaExtensionPayload extends Record<string, unknown> {
  assetId?: string;
  audioAssetId?: string;
  fit?: "cover" | "contain" | "fill";
  loop?: boolean;
  volume?: number;
}
export const MediaExtension: WithVueComponentExtension<MediaExtensionPayload> = {
  type: ExtensionType.WithVueComponent,
  extId: "media",
  shortName: "MED",
  description: "Play a media asset.",
  component: { name: "MediaExtension", setup: () => () => h("span") },
  formatCueMessage: (event) =>
    h("span", `MEDIA | Asset: ${getExtensionPayload<MediaExtensionPayload>(event)?.assetId ?? ""}`),
};
