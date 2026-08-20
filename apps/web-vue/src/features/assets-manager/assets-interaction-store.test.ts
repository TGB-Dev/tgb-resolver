import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";

describe("assets interaction store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("transfers copied entries into a folder and keeps the clipboard", async () => {
    const assets = useAssetsManagerStore();
    assets.applyShowState({
      showVersion: 1,
      assets: {
        folders: [{ id: "folder", name: "Folder", children: [] }],
        items: [{ id: "file", fileName: "file" }],
      },
    } as never);
    const transfer = vi.spyOn(assets, "transferEntry").mockResolvedValue();
    const interaction = useAssetsInteractionStore();
    interaction.copySelection("file");
    await interaction.pasteInto("folder");
    expect(transfer).toHaveBeenCalledWith("file", false, "folder", true);
    expect(interaction.clipboard?.mode).toBe("copy");
  });

  it("clears a cut drag after a successful drop", async () => {
    const assets = useAssetsManagerStore();
    assets.applyShowState({
      showVersion: 1,
      assets: {
        folders: [{ id: "folder", name: "Folder", children: [] }],
        items: [{ id: "file", fileName: "file" }],
      },
    } as never);
    const transfer = vi.spyOn(assets, "transferEntry").mockResolvedValue();
    const interaction = useAssetsInteractionStore();
    interaction.beginDrag("file", "move");
    await interaction.dropInto("folder", "move");
    expect(transfer).toHaveBeenCalledWith("file", false, "folder", false);
    expect(interaction.dragState).toBeNull();
  });
});
