import { Text } from "@chakra-ui/react";
import { defineForm, FieldDataType, ValidationRuleKind } from "@tgb-form/core";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";

import {
  ExtensionType,
  getExtensionPayload,
  type WithReactComponentExtension,
} from "../base/types";
import { sharedValidatorRegistry } from "../init";
import { ImageExtensionComponent } from "./components";

export type ImageExtensionPayload = Record<string, unknown> & {
  assetId: string;
  fit?: "cover" | "contain" | "fill";
};

const formSchema = defineForm(
  {
    fields: {
      assetId: {
        type: FieldDataType.String,
        defaultValue: "",
        label: "Asset",
        component: "asset-selector",
        rules: [
          {
            kind: ValidationRuleKind.Required,
            message: "Asset is required",
          },
        ],
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
      },
    },
  },
  { validators: sharedValidatorRegistry },
);

export const ImageExtension: WithReactComponentExtension<ImageExtensionPayload> = {
  type: ExtensionType.WithReactComponent,
  component: ImageExtensionComponent,
  configForm: formSchema,
  earlyDestruction: undefined,
  extId: "img",
  shortName: "IMG",
  description: "Showing fullscreen image in the audience view.",
  formatCueMessage: (event: TimelineTableItem) => {
    const payload = getExtensionPayload<ImageExtensionPayload>(event);
    const assetId = payload?.assetId ?? "(none)";
    const displayName = event.customName || assetsManagerModel.findEntryName(assetId) || assetId;
    return (
      <Text as="span">
        <Text as="span" fontFamily="mono" color="fg.muted">
          IMG
        </Text>{" "}
        | Asset:{" "}
        <Text as="span" fontFamily="mono" color="fg.success">
          {displayName}
        </Text>
      </Text>
    );
  },
};
