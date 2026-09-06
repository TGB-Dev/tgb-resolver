import { describe, expect, test } from "vitest";

import { parseErrorMessage } from "../error-message";

describe("parseErrorMessage", () => {
  test("prefers Huma detail over title", () => {
    expect(
      parseErrorMessage({
        title: "Unprocessable Entity",
        status: 422,
        detail: "invalid xml import",
      }),
    ).toBe("invalid xml import");
  });

  test("reads the first Huma errors[].message", () => {
    expect(
      parseErrorMessage({
        title: "Unprocessable Entity",
        status: 422,
        errors: [{ message: "unexpected property", location: "body.eventId" }],
      }),
    ).toBe("unexpected property");
  });

  test("unwraps ofetch error data", () => {
    const error = Object.assign(new Error('[PATCH] "http://x": 422 Unprocessable Entity'), {
      data: { detail: "timeline is read-only" },
    });
    expect(parseErrorMessage(error)).toBe("timeline is read-only");
  });

  test("unwraps ofetch response._data", () => {
    const error = Object.assign(new Error("failed"), {
      response: { _data: { errors: [{ message: "target folder does not exist" }] } },
    });
    expect(parseErrorMessage(error)).toBe("target folder does not exist");
  });

  test("parses JSON embedded in the message", () => {
    const error = new Error(
      '{"$schema":"http://x/schemas/ErrorModel.json","title":"Unprocessable Entity","status":422,"detail":"validation failed","errors":[{"message":"unexpected property"}]}',
    );
    expect(parseErrorMessage(error)).toBe("unexpected property");
  });

  test("keeps legacy FastEndpoints general errors", () => {
    expect(parseErrorMessage({ errors: { GeneralErrors: ["boom"] } })).toBe("boom");
  });

  test("falls back to plain messages and truncates blobs", () => {
    expect(parseErrorMessage(new Error("nope"))).toBe("nope");
    expect(parseErrorMessage("oops")).toBe("oops");
    expect(parseErrorMessage(undefined)).toBe("Unknown error");
    expect(parseErrorMessage(new Error("x".repeat(500)))).toHaveLength(300);
  });
});
