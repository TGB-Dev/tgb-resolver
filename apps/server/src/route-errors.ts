import type { ShowServiceErrorReason, ShowServiceErrorResponse } from "@tgb-resolver/contracts";
import { status } from "elysia";

import { ShowServiceError } from "./show-service";

function toStatusCode(reason: ShowServiceErrorReason) {
  switch (reason) {
    case "not_found":
      return 404;
    case "readonly":
    case "version_drift":
    case "invalid_state":
      return 409;
    default:
      return 400;
  }
}

export function mapShowServiceError(error: unknown) {
  if (!(error instanceof ShowServiceError)) {
    throw error;
  }

  const response: ShowServiceErrorResponse = {
    reason: error.reason,
    showVersion: error.showVersion,
    message: error.message,
  };

  return status(toStatusCode(error.reason), response);
}
