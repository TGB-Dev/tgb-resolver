import { defineForm, FieldDataType } from "@tgb-form/core";
import { h } from "vue";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";

export interface MediaExtensionPayload extends Record<string, unknown> {
  assetId?: string;
  audioAssetId?: string;
  fit?: "cover" | "contain" | "fill";
  loop?: boolean;
  volume?: number;
}

const formSchema = defineForm(
  {
    fields: {
      assetId: {
        type: FieldDataType.String,
        defaultValue: "",
        label: "Visual asset",
        component: "asset-selector",
        props: { placeholder: "Image or video asset..." },
        validators: [{ name: "assetsExist", message: "Asset not found on the server" }],
      },
      audioAssetId: {
        type: FieldDataType.String,
        defaultValue: "",
        label: "Audio asset",
        description: "Optional separate audio track to layer over the visual.",
        component: "asset-selector",
        props: { placeholder: "Audio asset (optional)..." },
        validators: [{ name: "assetsExist", message: "Asset not found on the server" }],
      },
      fit: {
        type: FieldDataType.String,
        defaultValue: "cover",
        label: "Fit Mode",
        component: "select-input",
        props: {
          options: [
            { value: "cover", label: "Cover" },
            { value: "contain", label: "Contain" },
            { value: "fill", label: "Fill" },
          ],
        },
      },
      loop: {
        type: FieldDataType.Boolean,
        defaultValue: true,
        label: "Loop",
      },
      volume: {
        type: FieldDataType.Number,
        defaultValue: 0.5,
        label: "Volume",
        props: { min: 0, max: 1, step: 0.1 },
      },
    },
  },
  { validators: sharedValidatorRegistry },
);

export const MediaExtension: WithVueComponentExtension<MediaExtensionPayload> = {
  type: ExtensionType.WithVueComponent,
  extId: "media",
  shortName: "MED",
  description: "Play a media asset.",
  configForm: formSchema,
  component: { name: "MediaExtension", setup: () => () => h("span") },
  formatCueMessage: (event) =>
    h("span", `MEDIA | Asset: ${getExtensionPayload<MediaExtensionPayload>(event)?.assetId ?? ""}`),
};
