import { css } from "@styled-system/css";
import { h } from "vue";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
export interface ImageExtensionPayload extends Record<string, unknown> {
  assetId: string;
  fit?: "cover" | "contain" | "fill";
}
const imageClasses: Record<NonNullable<ImageExtensionPayload["fit"]>, string> = {
  cover: css({ width: "full", height: "full", objectFit: "cover" }),
  contain: css({ width: "full", height: "full", objectFit: "contain" }),
  fill: css({ width: "full", height: "full", objectFit: "fill" }),
};
export const ImageExtension: WithVueComponentExtension<ImageExtensionPayload> = {
  type: ExtensionType.WithVueComponent,
  extId: "img",
  shortName: "IMG",
  description: "Show a fullscreen image.",
  component: {
    name: "ImageExtension",
    props: { payload: { type: Object, required: true } },
    setup: (props) => () =>
      h("img", {
        src: `/assets/${(props.payload as ImageExtensionPayload).assetId}`,
        class: imageClasses[(props.payload as ImageExtensionPayload).fit ?? "cover"],
      }),
  },
  formatCueMessage: (event) =>
    h(
      "span",
      `IMG | Asset: ${getExtensionPayload<ImageExtensionPayload>(event)?.assetId ?? "(none)"}`,
    ),
};
