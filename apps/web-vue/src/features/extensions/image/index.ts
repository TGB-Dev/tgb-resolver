import { css } from "@styled-system/css";
import { defineForm, FieldDataType, ValidationRuleKind } from "@tgb-form/core";
import { h } from "vue";

import { getPreloadedAsset } from "@/utils/preload-assets";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
import { sharedValidatorRegistry } from "../init";

export interface ImageExtensionPayload extends Record<string, unknown> {
  assetId: string;
  fit?: "cover" | "contain" | "fill";
}

const imageClasses: Record<NonNullable<ImageExtensionPayload["fit"]>, string> = {
  cover: css({ w: "full", h: "full", objectFit: "cover" }),
  contain: css({ w: "full", h: "full", objectFit: "contain" }),
  fill: css({ w: "full", h: "full", objectFit: "fill" }),
};

const formSchema = defineForm(
  {
    fields: {
      assetId: {
        type: FieldDataType.String,
        defaultValue: "",
        label: "Asset",
        component: "asset-selector",
        rules: [{ kind: ValidationRuleKind.Required, message: "Asset is required" }],
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
    },
  },
  { validators: sharedValidatorRegistry },
);

export const ImageExtension: WithVueComponentExtension<ImageExtensionPayload> = {
  type: ExtensionType.WithVueComponent,
  extId: "img",
  shortName: "IMG",
  description: "Show a fullscreen image.",
  configForm: formSchema,
  component: {
    name: "ImageExtension",
    props: { payload: { type: Object, required: true } },
    setup: (props) => () => {
      const payload = props.payload as ImageExtensionPayload;
      const preloaded = getPreloadedAsset(payload.assetId);
      const src = preloaded
        ? URL.createObjectURL(new Blob([preloaded]))
        : `/assets/${payload.assetId}`;
      return h("img", {
        src,
        class: imageClasses[payload.fit ?? "cover"],
      });
    },
  },
  formatCueMessage: (event) =>
    h(
      "span",
      `IMG | Asset: ${getExtensionPayload<ImageExtensionPayload>(event)?.assetId ?? "(none)"}`,
    ),
};
