import type { BoxProps } from "@chakra-ui/react";
import { VerdictRunResult } from "@tgb-resolver/contracts";

import { useColorMode } from "@/features/shared/ui/color-mode";

// Derived from https://www.chakra-ui.com/docs/theming/colors

// Haven't found a cleaner solution, but it works
export type ChakraColor = BoxProps["color"];
type SemanticToken =
  | ""
  | "subtle"
  | "muted"
  | "emphasized"
  | "inverted"
  | "panel"
  | "error"
  | "warning"
  | "success"
  | "info";

interface VerdictExplicitColorDef {
  fg: { light: ChakraColor; dark: ChakraColor };
  border: { light: ChakraColor; dark: ChakraColor };
  bg: { light: ChakraColor; dark: ChakraColor };
}

interface VerdictSemanticColorDef {
  semanticToken: SemanticToken;
}

interface SingleColorDef {
  color: ChakraColor;
}

type VerdictColorDef = VerdictExplicitColorDef | VerdictSemanticColorDef | SingleColorDef;

const verdictColorDefs: Record<VerdictRunResult, VerdictColorDef> = {
  [VerdictRunResult.ACCEPTED]: {
    semanticToken: "success",
  },
  [VerdictRunResult.WRONG_ANSWER]: {
    semanticToken: "error",
  },
  [VerdictRunResult.TIME_LIMIT_EXCEEDED]: { semanticToken: "warning" },
  [VerdictRunResult.MEMORY_LIMIT_EXCEEDED]: { semanticToken: "warning" },
  [VerdictRunResult.OUTPUT_LIMIT_EXCEEDED]: { semanticToken: "warning" },
  [VerdictRunResult.INVALID_RETURN]: { semanticToken: "error" },
  [VerdictRunResult.RUNTIME_ERROR]: { semanticToken: "error" },
  [VerdictRunResult.COMPILE_ERROR]: { semanticToken: "warning" },
  [VerdictRunResult.INTERNAL_ERROR]: { semanticToken: "warning" },
  [VerdictRunResult.SHORT_CIRCUITED]: { semanticToken: "muted" },
  [VerdictRunResult.ABORTED]: { semanticToken: "error" },
  [VerdictRunResult.PENDING]: {
    fg: { light: "white", dark: "white" },
    border: { light: "cyan.400", dark: "cyan.400" },
    bg: { light: "purple.700", dark: "purple.700" },
  },
  [VerdictRunResult.UNKNOWN]: {
    semanticToken: "subtle",
  },
  [VerdictRunResult.UNRESOLVED]: {
    color: "cyan",
  },
};

const verdictShortCodes: Record<VerdictRunResult, string> = {
  [VerdictRunResult.ACCEPTED]: "AC",
  [VerdictRunResult.WRONG_ANSWER]: "WA",
  [VerdictRunResult.TIME_LIMIT_EXCEEDED]: "TLE",
  [VerdictRunResult.MEMORY_LIMIT_EXCEEDED]: "MLE",
  [VerdictRunResult.OUTPUT_LIMIT_EXCEEDED]: "OLE",
  [VerdictRunResult.INVALID_RETURN]: "IR",
  [VerdictRunResult.RUNTIME_ERROR]: "RTE",
  [VerdictRunResult.COMPILE_ERROR]: "CE",
  [VerdictRunResult.INTERNAL_ERROR]: "IE",
  [VerdictRunResult.SHORT_CIRCUITED]: "SC",
  [VerdictRunResult.ABORTED]: "AB",
  [VerdictRunResult.PENDING]: "?",
  [VerdictRunResult.UNKNOWN]: " ",
  [VerdictRunResult.UNRESOLVED]: "?",
};

export function verdictShortCode(verdict?: VerdictRunResult): string {
  return verdict ? (verdictShortCodes[verdict] ?? "?") : "?";
}

interface UseVerdictColorReturn {
  fg: ChakraColor;
  border: ChakraColor;
  bg: ChakraColor;
}

export function useVerdictColor(
  verdict: VerdictRunResult = VerdictRunResult.UNKNOWN,
): UseVerdictColorReturn {
  const { colorMode } = useColorMode();
  const colorDef = verdictColorDefs[verdict] ?? { semanticToken: "muted" };

  if ("semanticToken" in colorDef) {
    return {
      fg: `fg.${colorDef.semanticToken}`,
      border: `border.${colorDef.semanticToken}`,
      bg: `bg.${colorDef.semanticToken}`,
    };
  }

  if ("color" in colorDef) {
    return {
      fg: `${colorDef.color}.contrast`,
      border: `${colorDef.color}.border`,
      bg: `${colorDef.color}.solid`,
    };
  }

  if (colorMode === "dark") {
    return {
      fg: colorDef.fg.dark,
      border: colorDef.border.dark,
      bg: colorDef.bg.dark,
    };
  }

  return {
    fg: colorDef.fg.light,
    border: colorDef.border.light,
    bg: colorDef.bg.light,
  };
}
