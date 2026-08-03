import { createValidatorRegistry } from "@tgb-form/core";
import * as v from "valibot";

import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";
import type { FsEntry } from "@/features/assets-manager/types";

export const sharedValidatorRegistry = createValidatorRegistry({
  assetsExist: (rule) =>
    v.check(
      (value: unknown) => {
        const assetId = typeof value === "string" ? value.trim() : "";
        if (!assetId) return true;
        const entries = assetsManagerModel.allFiles.value;
        if (entries.length === 0) return true;
        return entries.some((e: FsEntry) => !e.isDirectory && e.id === assetId);
      },
      String(rule.message ?? "Asset not found on the server"),
    ),
});

let initialized = false;

export function initExtensions(): void {
  if (initialized) return;
  initialized = true;
}
