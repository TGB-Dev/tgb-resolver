import { Text } from "@chakra-ui/react";
import { defineForm, FieldDataType } from "@tgb-form/core";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";

import {
  ExtensionType,
  getExtensionPayload,
  type WithReactComponentExtension,
} from "../base/types";
import { sharedValidatorRegistry } from "../init";
import { MediaExtensionComponent } from "./components";

export type MediaExtensionPayload = Record<string, unknown> & {
  assetId?: string;
  audioAssetId?: string;
  fit?: "cover" | "contain" | "fill";
  loop?: boolean;
  volume?: number;
};

const formSchema = defineForm(
  {
    fields: {
      assetId: {
        type: FieldDataType.String,
        defaultValue: "",
        label: "Visual asset",
        component: "asset-selector",
        props: { placeholder: "Image or video asset..." },
        validators: [
          {
            name: "assetsExist",
            message: "Asset not found on the server",
          },
        ],
      },
      audioAssetId: {
        type: FieldDataType.String,
        defaultValue: "",
        label: "Audio asset",
        description: "Optional separate audio track to layer over the visual.",
        component: "asset-selector",
        props: { placeholder: "Audio asset (optional)..." },
        validators: [
          {
            name: "assetsExist",
            message: "Asset not found on the server",
          },
        ],
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

export const MediaExtension: WithReactComponentExtension<MediaExtensionPayload> = {
  type: ExtensionType.WithReactComponent,
  component: MediaExtensionComponent,
  configForm: formSchema,
  earlyDestruction: undefined,
  extId: "media",
  shortName: "MED",
  description: "Play an image, video, or audio asset in the audience view.",
  formatCueMessage: (event: TimelineTableItem) => {
    const payload = getExtensionPayload<MediaExtensionPayload>(event);
    const assetId = payload?.assetId ?? "";
    const audioAssetId = payload?.audioAssetId ?? "";
    const displayName = event.customName || assetsManagerModel.findEntryName(assetId) || assetId;
    return (
      <Text as="span">
        <Text as="span" fontFamily="mono" color="fg.muted">
          MEDIA
        </Text>{" "}
        | Asset:{" "}
        <Text as="span" fontFamily="mono" color="fg.success">
          {displayName}
        </Text>
        {audioAssetId && (
          <>
            {" "}
            | Audio:{" "}
            <Text as="span" fontFamily="mono" color="fg.success">
              {assetsManagerModel.findEntryName(audioAssetId) || audioAssetId}
            </Text>
          </>
        )}
      </Text>
    );
  },
};
