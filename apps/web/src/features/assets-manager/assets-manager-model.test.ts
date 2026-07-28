import {
  PlaybackStatus,
  ShowMode,
  ShowSource,
  type ShowStateSnapshot,
} from "@tgb-resolver/contracts";
import { beforeEach, expect, test } from "vitest";

import { assetsManagerModel } from "./assets-manager-model";

function makeSnapshot(overrides?: Partial<ShowStateSnapshot>): ShowStateSnapshot {
  return {
    showVersion: 1,
    meta: { title: "t", source: ShowSource.MANUAL },
    mode: ShowMode.EDITING,
    playback: { status: PlaybackStatus.IDLE, executionSequence: 0 },
    timeline: [],
    assets: {
      folders: [
        { id: "f1", name: "Sounds", children: [] },
        {
          id: "f2",
          name: "Images",
          children: [{ id: "f3", name: "Logos", children: [] }],
        },
      ],
      items: [
        { id: "a1", fileName: "intro.mp3", contentType: "audio/mpeg", folderId: "f1" },
        {
          id: "a2",
          fileName: "logo.png",
          contentType: "image/png",
          sizeBytes: 1024,
          folderId: "f3",
        },
        { id: "a3", fileName: "bg.jpg", contentType: "image/jpeg", sizeBytes: 2048 },
      ],
    },
    ...overrides,
  };
}

beforeEach(() => {
  assetsManagerModel.applyShowState(makeSnapshot());
  assetsManagerModel.selectedEntryId.value = null;
  assetsManagerModel.selectedIds.value = new Set();
  assetsManagerModel.lastClickedIndex.value = null;
});

test("applyShowState populates folderTree and entries", () => {
  expect(assetsManagerModel.folderTree.value).toHaveLength(2);
  expect(assetsManagerModel.folderTree.value[0].name).toBe("Sounds");
  expect(assetsManagerModel.folderTree.value[1].children).toHaveLength(1);
});

test("entries shows root folders and root files when no folder selected", () => {
  expect(assetsManagerModel.selectedEntryId.value).toBeNull();
  const all = assetsManagerModel.entries.value;
  // root folders: Sounds, Images; root files: bg.jpg
  expect(all).toHaveLength(3);
  expect(all.filter((e) => e.isDirectory)).toHaveLength(2);
  expect(all.find((e) => e.name === "bg.jpg")?.isDirectory).toBe(false);
});

test("entries shows child folders and belonging files when a folder is selected", () => {
  assetsManagerModel.selectEntry("f2");
  const all = assetsManagerModel.entries.value;
  // Images children: Logos folder; no files own f2
  expect(all).toHaveLength(1);
  expect(all[0].name).toBe("Logos");
  expect(all[0].isDirectory).toBe(true);
});

test("entries shows belonging files in nested folder", () => {
  assetsManagerModel.selectEntry("f3");
  const all = assetsManagerModel.entries.value;
  expect(all).toHaveLength(1);
  expect(all[0].name).toBe("logo.png");
  expect(all[0].isDirectory).toBe(false);
});

test("selectEntry clears multi-selection", () => {
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 0);
  expect(assetsManagerModel.selectedIds.value.size).toBe(1);

  assetsManagerModel.selectEntry("f1");
  expect(assetsManagerModel.selectedIds.value.size).toBe(0);
});

test("clearSelection empties selectedIds", () => {
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 0);
  expect(assetsManagerModel.selectedIds.value.size).toBeGreaterThan(0);

  assetsManagerModel.clearSelection();
  expect(assetsManagerModel.selectedIds.value.size).toBe(0);
});

test("handleEntryClick single-click selects one entry", () => {
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 0);
  expect(assetsManagerModel.selectedIds.value.size).toBe(1);
});

test("handleEntryClick meta+click toggles entry in selection", () => {
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 0);
  const firstId = [...assetsManagerModel.selectedIds.value][0];

  assetsManagerModel.handleEntryClick({ metaKey: true, ctrlKey: false, shiftKey: false }, 1);
  expect(assetsManagerModel.selectedIds.value.size).toBe(2);

  assetsManagerModel.handleEntryClick({ metaKey: true, ctrlKey: false, shiftKey: false }, 0);
  expect(assetsManagerModel.selectedIds.value.size).toBe(1);
  expect(assetsManagerModel.selectedIds.value.has(firstId)).toBe(false);
});

test("handleEntryClick shift+click selects range", () => {
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 0);
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: true }, 2);
  expect(assetsManagerModel.selectedIds.value.size).toBe(3);
});

test("handleEntryClick plain click replaces selection", () => {
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 0);
  assetsManagerModel.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 2);
  expect(assetsManagerModel.selectedIds.value.size).toBe(1);
});

test("findEntryName finds root folder by id", () => {
  expect(assetsManagerModel.findEntryName("f1")).toBe("Sounds");
});

test("findEntryName finds nested folder by id", () => {
  expect(assetsManagerModel.findEntryName("f3")).toBe("Logos");
});

test("findEntryName finds file by id", () => {
  expect(assetsManagerModel.findEntryName("a1")).toBe("intro.mp3");
});

test("findEntryName returns undefined for unknown id", () => {
  expect(assetsManagerModel.findEntryName("nonexistent")).toBeUndefined();
});

test("toggleFolder adds and removes from expandedFolderIds", () => {
  expect(assetsManagerModel.expandedFolderIds.value.has("f1")).toBe(true);

  assetsManagerModel.toggleFolder("f1");
  expect(assetsManagerModel.expandedFolderIds.value.has("f1")).toBe(false);

  assetsManagerModel.toggleFolder("f1");
  expect(assetsManagerModel.expandedFolderIds.value.has("f1")).toBe(true);
});
