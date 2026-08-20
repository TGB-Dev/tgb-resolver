import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useAssetsManagerStore } from "./assets-manager-store";

describe("assets manager store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("hydrates folders and files into the selected directory", () => {
    const store = useAssetsManagerStore();
    store.applyShowState({
      showVersion: 4,
      assets: {
        folders: [{ id: "folder", name: "Folder", children: [] }],
        items: [
          {
            id: "file",
            fileName: "answer.txt",
            contentType: "text/plain",
            sizeBytes: 3,
            folderId: "folder",
          },
        ],
      },
    } as never);

    expect(store.entries.map((entry) => entry.name)).toEqual(["Folder"]);
    store.selectEntry("folder");
    expect(store.entries.map((entry) => entry.name)).toEqual(["answer.txt"]);
  });

  it("supports modifier and range selection", () => {
    const store = useAssetsManagerStore();
    store.applyShowState({
      showVersion: 1,
      assets: { folders: [], items: ["a", "b", "c"].map((id) => ({ id, fileName: id })) },
    } as never);
    store.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: false }, 0);
    store.handleEntryClick({ metaKey: true, ctrlKey: false, shiftKey: false }, 1);
    store.handleEntryClick({ metaKey: false, ctrlKey: false, shiftKey: true }, 2);
    expect([...store.selectedIds]).toEqual(["a", "b", "c"]);
  });
});
