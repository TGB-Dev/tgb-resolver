import { createValidatorRegistry } from "@tgb-form/core";
import * as v from "valibot";

export const sharedValidatorRegistry = createValidatorRegistry({
  assetsExist: (rule) =>
    v.check(
      (value: unknown) => typeof value !== "string" || value.trim().length > 0,
      String(rule.message ?? "Asset not found"),
    ),
});
