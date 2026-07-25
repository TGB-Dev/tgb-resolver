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
  [VerdictRunResult.PENDING]: "white",
  [VerdictRunResult.UNKNOWN]: "fg.muted",
};

const verdictBorderColors: Partial<Record<VerdictRunResult, string>> = {
  [VerdictRunResult.PENDING]: "cyan.400",
};

const verdictBgColors: Partial<Record<VerdictRunResult, string>> = {
  [VerdictRunResult.PENDING]: "purple.700",
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
  const fallback = "gray.400";
  return verdict ? (verdictColors[verdict] ?? fallback) : fallback;
}

export function verdictBorderCode(verdict?: VerdictRunResult): string {
  if (verdict && verdictBorderColors[verdict]) return verdictBorderColors[verdict];
  return verdictColorCode(verdict).replace("fg.", "border.");
}

export function verdictBgCode(verdict?: VerdictRunResult): string {
  if (verdict && verdictBgColors[verdict]) return verdictBgColors[verdict];
  return verdictColorCode(verdict).replace("fg.", "bg.");
}

export function verdictShortCode(verdict?: VerdictRunResult): string {
  return verdict ? (verdictShortCodes[verdict] ?? "?") : "?";
}
