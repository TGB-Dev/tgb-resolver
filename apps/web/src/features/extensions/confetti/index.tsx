import { Text } from "@chakra-ui/react";
import { defineForm, FieldDataType } from "@tgb-form/core";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import {
  ExtensionType,
  getExtensionPayload,
  type WithReactComponentExtension,
} from "../base/types";
import { sharedValidatorRegistry } from "../init";
import { ConfettiExtensionComponent } from "./components";
import { confettiPresets, presetById } from "./presets";

export type ConfettiExtensionPayload = Record<string, unknown> & {
  preset?: string;
};

const formSchema = defineForm(
  {
    fields: {
      preset: {
        type: FieldDataType.String,
        defaultValue: "cannon",
        label: "Preset",
        description: "Confetti animation style to run in the audience view.",
        component: "select-input",
        props: {
          options: confettiPresets.map((preset) => ({
            value: preset.id,
            label: preset.label,
          })),
        },
      },
    },
  },
  { validators: sharedValidatorRegistry },
);

export const ConfettiExtension: WithReactComponentExtension<ConfettiExtensionPayload> = {
  type: ExtensionType.WithReactComponent,
  component: ConfettiExtensionComponent,
  configForm: formSchema,
  earlyDestruction: undefined,
  extId: "confetti",
  shortName: "CNF",
  description: "Run confetti in the audience view.",
  formatCueMessage: (event: TimelineTableItem) => {
    const payload = getExtensionPayload<ConfettiExtensionPayload>(event);
    const presetId = payload?.preset ?? "cannon";
    const label = presetById(presetId)?.label ?? presetId;
    return (
      <Text as="span">
        <Text as="span" fontFamily="mono" color="fg.muted">
          CNF
        </Text>{" "}
        | Preset:{" "}
        <Text as="span" fontFamily="mono" color="fg.success">
          {label}
        </Text>
      </Text>
    );
  },
};
