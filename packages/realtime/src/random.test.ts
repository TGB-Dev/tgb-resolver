import { describe, expect, test } from "vitest";

import { seedSfc32 } from "./random";

describe("seedSfc32", () => {
  test("is deterministic for the same seed", () => {
    const a = seedSfc32(12345);
    const b = seedSfc32(12345);
    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  test("produces different sequences for different seeds", () => {
    const a = seedSfc32(1);
    const b = seedSfc32(2);
    expect(Array.from({ length: 10 }, () => a())).not.toEqual(
      Array.from({ length: 10 }, () => b()),
    );
  });

  test("defaults to a fixed deterministic sequence when no seed is given", () => {
    const a = seedSfc32();
    const b = seedSfc32();
    expect(Array.from({ length: 10 }, () => a())).toEqual(Array.from({ length: 10 }, () => b()));
  });

  test("always returns values in [0, 1)", () => {
    const random = seedSfc32();
    for (let i = 0; i < 1_000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test("accepts an explicit 4-tuple state", () => {
    const random = seedSfc32([1, 2, 3, 4]);
    expect(random()).toBeGreaterThanOrEqual(0);
    expect(random()).toBeLessThan(1);
  });
});
