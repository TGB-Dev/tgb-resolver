import { describe, expect, test } from "vitest";

import { shouldSkipSeek } from "./animations-model";

describe("shouldSkipSeek", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  test("returns false for adjacent seeks", () => {
    expect(shouldSkipSeek(ids, 1, 2)).toBe(false);
    expect(shouldSkipSeek(ids, 12, 11)).toBe(false);
  });

  test("returns false below the threshold", () => {
    expect(shouldSkipSeek(ids, 1, 9)).toBe(false);
  });

  test("returns true at exactly the threshold", () => {
    expect(shouldSkipSeek(ids, 1, 11)).toBe(true);
  });

  test("returns true above the threshold", () => {
    expect(shouldSkipSeek(ids, 1, 12)).toBe(true);
  });

  test("uses absolute distance for backward seeks", () => {
    expect(shouldSkipSeek(ids, 12, 1)).toBe(true);
  });

  test("returns true when seeking to null (reset)", () => {
    expect(shouldSkipSeek(ids, 5, null)).toBe(true);
  });

  test("returns false when seeking from null (start)", () => {
    expect(shouldSkipSeek(ids, null, 5)).toBe(false);
  });

  test("returns false when either id is unknown", () => {
    expect(shouldSkipSeek(ids, 99, 5)).toBe(false);
    expect(shouldSkipSeek(ids, 5, 99)).toBe(false);
  });

  test("respects a custom threshold", () => {
    expect(shouldSkipSeek(ids, 1, 4, 3)).toBe(true);
    expect(shouldSkipSeek(ids, 1, 3, 3)).toBe(false);
  });
});
