import { describe, expect, test } from "vitest";

import { INTERNAL_DRAG_MIME } from "@/features/assets-manager/assets-interaction-store";

import { getDroppedAssetId } from "./get-dropped-asset-id";

describe("getDroppedAssetId", () => {
  test("reads INTERNAL_DRAG_MIME payload", () => {
    const dt = {
      getData: (type: string) =>
        type === INTERNAL_DRAG_MIME ? JSON.stringify(["a1", "folder"]) : "",
    } as DataTransfer;

    expect(getDroppedAssetId(dt, (id) => id === "a1")).toBe("a1");
  });
});
