import { VerdictRunResult } from "@tgb-resolver/contracts";

import { useColorMode } from "@/components/ui/color-mode";

interface VerdictExplicitColorDef {
  fg: { light: string; dark: string };
  border: { light: string; dark: string };
  bg: { light: string; dark: string };
}

interface VerdictSemanticColorDef {
  semanticToken: string;
}

type VerdictColorDef = VerdictExplicitColorDef | VerdictSemanticColorDef;

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
  [VerdictRunResult.UNKNOWN]: { semanticToken: "muted" },
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
  [VerdictRunResult.PENDING]: "PD",
  [VerdictRunResult.UNKNOWN]: "?",
};

export function verdictShortCode(verdict?: VerdictRunResult): string {
  return verdict ? (verdictShortCodes[verdict] ?? "?") : "?";
}

interface UseVerdictColorReturn {
  fg: string;
  border: string;
  bg: string;
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
