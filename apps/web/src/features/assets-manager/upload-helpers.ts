import { toaster } from "@/features/shared/ui/toaster";

import { assetsManagerModel } from "./assets-manager-model";

export async function processUploadBatch(
  targetFolderId: string | null,
  items: { isFile: boolean; file?: File; pathParts: string[] }[],
  onComplete?: () => void,
) {
  if (items.length === 0) {
    if (onComplete) onComplete();
    return;
  }

  const promise = async () => {
    let successes = 0;
    let fails = 0;

    for (const item of items) {
      try {
        const folderId = await assetsManagerModel.ensureFolderPath(targetFolderId, item.pathParts);
        if (item.isFile && item.file) {
          await assetsManagerModel.uploadAsset(folderId, item.file);
        }
        successes++;
      } catch (e) {
        console.error("Upload item failed:", e);
        fails++;
      }
    }

    if (onComplete) onComplete();

    if (fails > 0) {
      if (successes === 0) {
        throw new Error(`All ${fails} items failed to upload.`);
      }
      throw new Error(`Uploaded ${successes} items, but ${fails} failed.`);
    }
    return `Successfully uploaded ${successes} item${successes !== 1 ? "s" : ""}.`;
  };

  toaster.promise(promise(), {
    success: { title: "Upload Complete", description: (d: string) => d },
    error: {
      title: "Upload Incomplete",
      description: (e: unknown) => (e instanceof Error ? e.message : String(e)),
    },
    loading: {
      title: "Uploading...",
      description: `Processing ${items.length} item${items.length !== 1 ? "s" : ""}`,
    },
  });
}
