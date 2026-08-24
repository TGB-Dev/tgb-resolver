import { toaster } from "@/features/shared/ui/toaster";

import { useAssetsManagerStore } from "./assets-manager-store";

export async function processUploadBatch(
  targetFolderId: string | null,
  items: { isFile: boolean; file?: File; pathParts: string[] }[],
  onComplete?: () => void,
) {
  if (items.length === 0) {
    if (onComplete) onComplete();
    return;
  }

  const assetsStore = useAssetsManagerStore();

  let successes = 0;
  let fails = 0;

  for (const item of items) {
    try {
      if (item.isFile && item.file) {
        await assetsStore.uploadAsset(targetFolderId, item.file);
      }
      successes++;
    } catch (e) {
      console.error("Upload item failed:", e);
      fails++;
    }
  }

  if (onComplete) onComplete();

  if (fails > 0) {
    toaster.create({
      title: "Upload Incomplete",
      description: `Uploaded ${successes} items, but ${fails} failed.`,
      type: "error",
    });
  } else {
    toaster.create({
      title: "Upload Complete",
      description: `Successfully uploaded ${successes} item${successes !== 1 ? "s" : ""}.`,
      type: "success",
    });
  }
}
