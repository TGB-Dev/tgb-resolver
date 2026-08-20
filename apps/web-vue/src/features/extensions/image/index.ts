import { h } from "vue";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
export interface ImageExtensionPayload extends Record<string, unknown> {
  assetId: string;
  fit?: "cover" | "contain" | "fill";
}
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
        style: {
          objectFit: (props.payload as ImageExtensionPayload).fit ?? "cover",
          width: "100%",
          height: "100%",
        },
      }),
  },
  formatCueMessage: (event) =>
    h(
      "span",
      `IMG | Asset: ${getExtensionPayload<ImageExtensionPayload>(event)?.assetId ?? "(none)"}`,
    ),
};
