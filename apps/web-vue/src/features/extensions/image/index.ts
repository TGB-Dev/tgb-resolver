import { css } from "@styled-system/css";
import { defineForm, FieldDataType, ValidationRuleKind } from "@tgb-form/core";
import { h, onUnmounted, ref, watch } from "vue";

import { TgbResolverEasings } from "@/features/shared/anim/easings";
import { MotionDiv } from "@/lib/motion-factories";
import { API_BASE_URL } from "@/lib/runtime-config";
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

function useAssetUrl(getAssetId: () => string) {
  const url = ref<string | null>(null);
  const hasError = ref(false);
  let objectUrl: string | null = null;

  watch(
    () => [getAssetId(), hasError.value, url.value],
    () => {
      hasError.value = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      url.value = null;
      const assetId = getAssetId();
      if (!assetId) return;
      const buffer = getPreloadedAsset(assetId);
      if (buffer) {
        objectUrl = URL.createObjectURL(new Blob([buffer]));
        url.value = objectUrl;
        return;
      }
      url.value = `${API_BASE_URL}/assets/${assetId}`;
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });

  return { url, hasError };
}

const transition = { duration: 0.2, ease: TgbResolverEasings.swiftOut };

const overlayClasses = css({
  position: "absolute",
  inset: 0,
  zIndex: "dropdown",
  background: "bg",
});

const errorClasses = css({
  position: "absolute",
  inset: 0,
  zIndex: "dropdown",
  background: "bg",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const ImageExtension: WithVueComponentExtension<ImageExtensionPayload> = {
  type: ExtensionType.WithVueComponent,
  extId: "img",
  shortName: "IMG",
  description: "Show a fullscreen image.",
  configForm: defineForm(
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
  ),
  component: {
    name: "ImageExtension",
    props: { payload: { type: Object, required: true } },
    setup: (props) => {
      const getAssetId = () => (props.payload as ImageExtensionPayload)?.assetId ?? "";
      const { url, hasError } = useAssetUrl(getAssetId);
      return () => {
        const payload = props.payload as ImageExtensionPayload;
        const assetId = payload?.assetId ?? "";
        const fit = payload?.fit ?? "cover";
        if (!assetId || hasError.value) {
          return h(
            MotionDiv,
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
              transition,
              class: errorClasses,
            },
            [
              h(
                "span",
                { class: css({ fontFamily: "mono", fontSize: "lg" }) },
                `Asset not found: ${assetId || "none"}`,
              ),
            ],
          );
        }
        if (!url.value) return null;
        return h(
          MotionDiv,
          {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition,
            class: overlayClasses,
          },
          [
            h("img", {
              src: url.value,
              alt: `asset ${assetId}`,
              onError: () => (hasError.value = true),
              class: imageClasses[fit],
            }),
          ],
        );
      };
    },
  },
  formatCueMessage: (event) =>
    h(
      "span",
      `IMG | Asset: ${getExtensionPayload<ImageExtensionPayload>(event)?.assetId ?? "(none)"}`,
    ),
};
