import { Box, Text } from "@chakra-ui/react";
import { defineForm, FieldDataType } from "@tgb-form/core";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { motion } from "motion/react";

import {
  ExtensionType,
  getExtensionPayload,
  type WithReactComponentExtension,
} from "../base/types";
import { sharedValidatorRegistry } from "../init";

const MotionBox = motion.create(Box);

export type BlankExtensionPayload = Record<string, unknown> & {
  color?: "bg" | "black" | "white";
};

const colorToValue: Record<NonNullable<BlankExtensionPayload["color"]>, string> = {
  bg: "bg",
  black: "black",
  white: "white",
};

const formSchema = defineForm(
  {
    fields: {
      color: {
        type: FieldDataType.String,
        defaultValue: "bg",
        label: "Color",
        description: "Background color of the blank overlay.",
        component: "select-input",
        props: {
          options: [
            { value: "bg", label: "Theme background" },
            { value: "black", label: "Black" },
            { value: "white", label: "White" },
          ],
        },
      },
    },
  },
  { validators: sharedValidatorRegistry },
);

interface BlankExtensionComponentProps {
  payload: BlankExtensionPayload;
}

export function BlankExtensionComponent({ payload }: BlankExtensionComponentProps) {
  const color = payload?.color ?? "bg";
  return (
    <MotionBox
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      position="absolute"
      top={0}
      left={0}
      w="full"
      h="full"
      bg={colorToValue[color]}
      zIndex={1000}
    />
  );
}

export const BlankExtension: WithReactComponentExtension<BlankExtensionPayload> = {
  type: ExtensionType.WithReactComponent,
  component: BlankExtensionComponent,
  configForm: formSchema,
  earlyDestruction: undefined,
  extId: "blank",
  shortName: "BLK",
  description: "Covers the leaderboard with a blank overlay.",
  formatCueMessage: (event: TimelineTableItem) => {
    const payload = getExtensionPayload<BlankExtensionPayload>(event);
    const color = payload?.color ?? "bg";
    return (
      <Text as="span">
        <Text as="span" fontFamily="mono" color="fg.muted">
          BLK
        </Text>{" "}
        | Color:{" "}
        <Text as="span" fontFamily="mono" color="fg.success">
          {color}
        </Text>
      </Text>
    );
  },
};
