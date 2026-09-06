const MAX_MESSAGE_LENGTH = 300;

interface HumaErrorModel {
  title?: unknown;
  detail?: unknown;
  errors?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Huma `ErrorModel`: `{ title, detail, errors: [{ message }] }`. */
function fromHumaModel(model: HumaErrorModel): string | undefined {
  const errors = model.errors;
  if (Array.isArray(errors)) {
    for (const entry of errors) {
      const message = isRecord(entry) ? asText(entry.message) : undefined;
      if (message) return message;
    }
  }
  return asText(model.detail) ?? asText(model.title);
}

/** Legacy FastEndpoints shape: `{ errors: { GeneralErrors: [...] } }`. */
function fromLegacyModel(body: { errors?: unknown; message?: unknown }): string | undefined {
  const errors = body.errors;
  if (isRecord(errors)) {
    for (const key of ["GeneralErrors", "generalErrors", "General"]) {
      const general = errors[key];
      if (Array.isArray(general) && typeof general[0] === "string" && general[0]) {
        return general[0];
      }
    }
    const first = Object.values(errors).find((v) => Array.isArray(v) && v.length > 0);
    if (Array.isArray(first) && typeof first[0] === "string" && first[0]) return first[0];
  }
  return asText(body.message);
}

/** ofetch errors carry the parsed body in `data` / `response._data`. */
function fromTransport(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const data = error.data ?? (isRecord(error.response) ? error.response._data : undefined);
  if (!isRecord(data)) return undefined;
  return (
    fromHumaModel(data as HumaErrorModel) ??
    fromLegacyModel(data as { errors?: unknown; message?: unknown })
  );
}

function fromValibotIssues(error: unknown): string | undefined {
  if (!isRecord(error) || !Array.isArray(error.issues)) return undefined;
  const messages = error.issues
    .map((issue) => (isRecord(issue) ? asText(issue.message) : undefined))
    .filter((m): m is string => m !== undefined);
  return messages.length > 0 ? messages.join(", ") : undefined;
}

function collapse(message: string): string {
  const single = message.replace(/\s+/g, " ").trim();
  return single.length > MAX_MESSAGE_LENGTH
    ? `${single.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
    : single;
}

/**
 * Turn anything thrown by API calls into a short human-readable line for
 * toasts and inline errors. Never returns raw JSON blobs.
 */
function fromPlainRecord(error: unknown): string | undefined {
  if (!isRecord(error) || error instanceof Error) return undefined;
  return (
    fromHumaModel(error as HumaErrorModel) ??
    fromLegacyModel(error as { errors?: unknown; message?: unknown })
  );
}

function fromDirectSources(error: unknown): string | undefined {
  return fromTransport(error) ?? fromValibotIssues(error) ?? fromPlainRecord(error);
}

function isJsonLike(value: string): boolean {
  return value.startsWith("{") || value.startsWith("[");
}

function fromJsonString(trimmed: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) return undefined;
    return (
      fromHumaModel(parsed as HumaErrorModel) ??
      fromLegacyModel(parsed as { errors?: unknown; message?: unknown })
    );
  } catch {
    return undefined;
  }
}

function fromErrorInstance(error: Error): string {
  if (!error.message) return "Unknown error";
  const trimmed = error.message.trim();
  if (isJsonLike(trimmed)) {
    const fromJson = fromJsonString(trimmed);
    if (fromJson) return collapse(fromJson);
  }
  return collapse(error.message);
}

export function parseErrorMessage(error: unknown): string {
  const direct = fromDirectSources(error);
  if (direct) return collapse(direct);
  if (error instanceof Error) return fromErrorInstance(error);
  if (typeof error === "string") return collapse(error);
  return "Unknown error";
}
