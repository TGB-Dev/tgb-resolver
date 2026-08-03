import { expect, test } from "vitest";

import { getDroppedAssetId } from "./asset-selector-renderer";

function dataTransfer(data: Record<string, string>): DataTransfer {
  return {
    getData: (type: string) => data[type] ?? "",
  } as DataTransfer;
}

test("uses the first internal asset-manager drag id", () => {
  expect(
    getDroppedAssetId(
      dataTransfer({ "application/x-tgb-asset-entry": JSON.stringify(["asset-1", "asset-2"]) }),
      (id) => id === "asset-1",
    ),
  ).toBe("asset-1");
});

test("rejects folders and unknown internal drag ids", () => {
  expect(
    getDroppedAssetId(
      dataTransfer({ "application/x-tgb-asset-entry": JSON.stringify(["folder-1"]) }),
      () => false,
    ),
  ).toBe("");
});
