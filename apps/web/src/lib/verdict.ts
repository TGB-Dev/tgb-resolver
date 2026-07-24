import { VerdictRunResult } from "@tgb-resolver/contracts";

const verdictColors: Partial<Record<VerdictRunResult, string>> = {
  [VerdictRunResult.ACCEPTED]: "fg.success",
  [VerdictRunResult.WRONG_ANSWER]: "fg.error",
  [VerdictRunResult.TIME_LIMIT_EXCEEDED]: "fg.warning",
  [VerdictRunResult.MEMORY_LIMIT_EXCEEDED]: "fg.warning",
  [VerdictRunResult.OUTPUT_LIMIT_EXCEEDED]: "fg.warning",
  [VerdictRunResult.INVALID_RETURN]: "fg.error",
  [VerdictRunResult.RUNTIME_ERROR]: "fg.error",
  [VerdictRunResult.COMPILE_ERROR]: "fg.warning",
  [VerdictRunResult.INTERNAL_ERROR]: "fg.warning",
  [VerdictRunResult.SHORT_CIRCUITED]: "fg.muted",
  [VerdictRunResult.ABORTED]: "fg.error",
  [VerdictRunResult.UNKNOWN]: "fg.muted",
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

export function verdictColorCode(verdict?: VerdictRunResult): string {
  return verdict ? (verdictColors[verdict] ?? "gray.400") : "gray.400";
}

export function verdictShortCode(verdict?: VerdictRunResult): string {
  return verdict ? (verdictShortCodes[verdict] ?? "?") : "?";
}
