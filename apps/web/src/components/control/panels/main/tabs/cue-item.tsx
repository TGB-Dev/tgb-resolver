import { Text, type TextProps, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";

export enum Cue {
  CURRENT,
  NEXT,
  PREVIOUS,
}

const CUE_CONFIG: Record<
  Cue,
  { label: string; headingSize: TextProps["fontSize"]; contentSize: TextProps["fontSize"] }
> = {
  [Cue.CURRENT]: { label: "Current", headingSize: "3xl", contentSize: "2xl" },
  [Cue.NEXT]: { label: "Next", headingSize: "2xl", contentSize: "xl" },
  [Cue.PREVIOUS]: { label: "Previous", headingSize: "xl", contentSize: "lg" },
};

interface CueItemProps {
  cue: Cue;
  children: ReactNode;
}

export function CueItem({ cue, children }: CueItemProps) {
  const config = CUE_CONFIG[cue];

  return (
    <VStack gap={4} alignItems="start">
      <Heading fontSize={config.headingSize}>{config.label}</Heading>
      <Text
        as="span"
        fontSize={config.contentSize}
        fontFamily="mono"
        textTransform="uppercase"
        overflowWrap="break-word"
        lineHeight="1.6"
      >
        {children}
      </Text>
    </VStack>
  );
}

export { CUE_CONFIG };
