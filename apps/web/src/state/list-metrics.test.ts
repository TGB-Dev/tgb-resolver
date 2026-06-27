import { describe, expect, test } from "vitest";

import {
  CHAKRA_SPACE_BASE_PX,
  CONTROL_TIMELINE_ROW_HEIGHT_PX,
  pxToChakraSpace,
} from "./list-metrics";

describe("list metrics", () => {
  test("exposes the Chakra spacing base in pixels", () => {
    expect(CHAKRA_SPACE_BASE_PX).toBe(4);
  });

  test("maps the control timeline row height to the Chakra spacing scale", () => {
    expect(CONTROL_TIMELINE_ROW_HEIGHT_PX).toBe(32);
    expect(pxToChakraSpace(CONTROL_TIMELINE_ROW_HEIGHT_PX)).toBe(8);
  });

  test("rejects pixel values that do not align to the Chakra spacing scale", () => {
    expect(() => pxToChakraSpace(30)).toThrow("Expected a Chakra spacing multiple");
  });
});
