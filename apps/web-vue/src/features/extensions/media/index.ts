import { css } from "@styled-system/css";
import { defineForm, FieldDataType } from "@tgb-form/core";
import { h, onUnmounted, ref, watch } from "vue";

import { TgbResolverEasings } from "@/features/shared/anim/easings";
import { MotionDiv } from "@/lib/motion-factories";
import { soundEngine } from "@/lib/sound-engine";

import { ExtensionType, getExtensionPayload, type WithVueComponentExtension } from "../base/types";
import { useAssetUrl } from "../base/use-asset-url";
import { sharedValidatorRegistry } from "../init";
import { assetContentType } from "./duration";

export interface MediaExtensionPayload extends Record<string, unknown> {
  assetId?: string;
  audioAssetId?: string;
  fit?: "cover" | "contain" | "fill";
  loop?: boolean;
  volume?: number;
}

const transition = { duration: 0.2, ease: TgbResolverEasings.swiftOut };

const overlayClasses = css({
  position: "absolute",
  inset: 0,
  zIndex: "dropdown",
  background: "bg",
});

export const MediaExtension: WithVueComponentExtension<MediaExtensionPayload> = {
  type: ExtensionType.WithVueComponent,
  extId: "media",
  shortName: "MED",
  description: "Play a media asset.",
  configForm: defineForm(
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
  ),
  component: {
    name: "MediaExtension",
    props: { payload: { type: Object, required: true } },
    setup: (props) => {
      const getVisualId = () => (props.payload as MediaExtensionPayload)?.assetId ?? "";
      const getAudioId = () => (props.payload as MediaExtensionPayload)?.audioAssetId ?? "";
      const visual = useAssetUrl(getVisualId);
      const audio = useAssetUrl(getAudioId);
      const videoRef = ref<HTMLVideoElement | null>(null);

      watch(
        () => [(props.payload as MediaExtensionPayload)?.volume ?? 0.5, visual.url.value],
        () => {
          if (videoRef.value)
            videoRef.value.volume = (props.payload as MediaExtensionPayload)?.volume ?? 0.5;
        },
        { immediate: true },
      );

      let audioStop: (() => void) | null = null;
      watch(
        () => [
          audio.url.value,
          (props.payload as MediaExtensionPayload)?.loop ?? true,
          (props.payload as MediaExtensionPayload)?.volume ?? 0.5,
        ],
        async () => {
          audioStop?.();
          audioStop = null;
          const audioUrl = audio.url.value;
          if (!audioUrl) return;
          const payload = props.payload as MediaExtensionPayload;
          const stop = await soundEngine.playAssetAudio(audioUrl, {
            loop: payload?.loop ?? true,
            volume: payload?.volume ?? 0.5,
          });
          audioStop = stop;
        },
        { immediate: true },
      );

      onUnmounted(() => {
        audioStop?.();
      });

      return () => {
        const payload = props.payload as MediaExtensionPayload;
        const visualAssetId = payload?.assetId ?? "";
        const audioAssetId = payload?.audioAssetId ?? "";
        if (!visualAssetId && !audioAssetId) return null;

        const fit = payload?.fit ?? "cover";
        const loop = payload?.loop ?? true;
        const contentType = visualAssetId ? assetContentType(visualAssetId) : undefined;
        const isVideo = contentType?.startsWith("video/") ?? false;

        if (!visualAssetId || !visual.url.value || visual.hasError.value) return null;

        if (isVideo) {
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
              h("video", {
                src: visual.url.value,
                autoPlay: true,
                loop,
                playsInline: true,
                ref: videoRef,
                onError: () => visual.markError(),
                class: css({ w: "full", h: "full", objectFit: fit }),
              }),
            ],
          );
        }
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
              src: visual.url.value,
              alt: `asset ${visualAssetId}`,
              onError: () => visual.markError(),
              class: css({ w: "full", h: "full", objectFit: fit }),
            }),
          ],
        );
      };
    },
  },
  formatCueMessage: (event) =>
    h("span", `MEDIA | Asset: ${getExtensionPayload<MediaExtensionPayload>(event)?.assetId ?? ""}`),
};
