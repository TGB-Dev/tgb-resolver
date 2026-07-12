import { VerdictRunResult } from "@tgb-resolver/contracts";

const verdictColors: Partial<Record<VerdictRunResult, string>> = {
  [VerdictRunResult.ACCEPTED]: "green.400",
  [VerdictRunResult.WRONG_ANSWER]: "red.400",
  [VerdictRunResult.TIME_LIMIT_EXCEEDED]: "yellow.400",
  [VerdictRunResult.MEMORY_LIMIT_EXCEEDED]: "yellow.400",
  [VerdictRunResult.OUTPUT_LIMIT_EXCEEDED]: "yellow.400",
  [VerdictRunResult.INVALID_RETURN]: "red.400",
  [VerdictRunResult.RUNTIME_ERROR]: "red.400",
  [VerdictRunResult.COMPILE_ERROR]: "orange.400",
  [VerdictRunResult.INTERNAL_ERROR]: "orange.400",
  [VerdictRunResult.SHORT_CIRCUITED]: "gray.400",
  [VerdictRunResult.ABORTED]: "red.400",
  [VerdictRunResult.UNKNOWN]: "gray.400",
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
  [VerdictRunResult.UNKNOWN]: "?",
};

export function verdictColorCode(verdict?: VerdictRunResult): string {
  return verdict ? (verdictColors[verdict] ?? "gray.400") : "gray.400";
}

export function verdictShortCode(verdict?: VerdictRunResult): string {
  return verdict ? (verdictShortCodes[verdict] ?? "?") : "?";
}
