import {
  PlaybackStatus,
  ShowMode,
  ShowSource,
  type ShowStateSnapshot,
} from "@tgb-resolver/contracts";
import { beforeEach, expect, test, vi } from "vitest";

import { assetsInteractionModel } from "./assets-interaction-model";
import { assetsManagerModel } from "./assets-manager-model";

function makeSnapshot(overrides?: Partial<ShowStateSnapshot>): ShowStateSnapshot {
  return {
    showVersion: 1,
    meta: { title: "t", source: ShowSource.MANUAL },
    mode: ShowMode.EDITING,
    playback: { status: PlaybackStatus.IDLE },
    timeline: [],
    assets: {
      folders: [
        {
          id: "f1",
          name: "Root",
          children: [{ id: "f2", name: "Child", children: [] }],
        },
      ],
      items: [
        { id: "a1", fileName: "one.png", contentType: "image/png", folderId: "f1" },
        { id: "a2", fileName: "two.png", contentType: "image/png", folderId: "f2" },
      ],
    },
    ...overrides,
  };
}

const transferSpy = vi
  .spyOn(assetsManagerModel, "transferEntry")
  .mockImplementation(async () => undefined);

beforeEach(() => {
  assetsManagerModel.applyShowState(makeSnapshot());
  assetsManagerModel.selectEntry("f1");
  assetsManagerModel.selectedIds.value = new Set(["a1"]);
  assetsInteractionModel.clearClipboard();
  assetsInteractionModel.clearDrag();

  transferSpy.mockClear();
});

test("resolveActionEntryIds uses selected set when primary id is selected", () => {
  assetsManagerModel.selectedIds.value = new Set(["a1", "a2"]);
  expect(assetsInteractionModel.resolveActionEntryIds("a1")).toEqual(["a1", "a2"]);
});

test("copySelection stores clipboard state", () => {
  assetsInteractionModel.copySelection("a1");
  expect(assetsInteractionModel.clipboard.value?.mode).toBe("copy");
  expect(assetsInteractionModel.clipboard.value?.entryIds).toEqual(["a1"]);
});

test("canTransferToFolder blocks moving folder into descendant", () => {
  expect(assetsInteractionModel.canTransferToFolder(["f1"], "f2")).toBe(false);
});

test("pasteInto calls transferEntry and keeps clipboard for copy", async () => {
  assetsInteractionModel.copySelection("a1");
  await assetsInteractionModel.pasteInto("f2");
  expect(transferSpy).toHaveBeenCalledWith("a1", false, "f2", true);
  expect(assetsInteractionModel.clipboard.value?.mode).toBe("copy");
});

test("pasteInto clears clipboard for cut mode", async () => {
  assetsInteractionModel.cutSelection("a1");
  await assetsInteractionModel.pasteInto("f2");
  expect(transferSpy).toHaveBeenCalledWith("a1", false, "f2", false);
  expect(assetsInteractionModel.clipboard.value).toBeNull();
});

test("canPasteInto rejects a cut into the entry's current folder", () => {
  assetsInteractionModel.cutSelection("a1");

  expect(assetsInteractionModel.canPasteInto("f1")).toBe(false);
});

test("canPasteInto allows copying into the entry's current folder", () => {
  assetsInteractionModel.copySelection("a1");

  expect(assetsInteractionModel.canPasteInto("f1")).toBe(true);
});

test("pasteInto copies into the current folder instead of treating it as a no-op move", async () => {
  assetsInteractionModel.copySelection("a1");

  await assetsInteractionModel.pasteInto("f1");

  expect(transferSpy).toHaveBeenCalledWith("a1", false, "f1", true);
});

test("dropInto clears the drag session when a transfer fails", async () => {
  transferSpy.mockRejectedValueOnce(new Error("transfer failed"));
  assetsInteractionModel.beginDrag("a1", "move");

  await expect(assetsInteractionModel.dropInto("f2", "move")).rejects.toThrow("transfer failed");

  expect(assetsInteractionModel.dragState.value).toBeNull();
});
