import { css } from "@styled-system/css";

export function validationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string") return message;
  }
  return String(error);
}

export const fieldErrorTextCss = css({ color: "fg.error", fontSize: "sm" });
