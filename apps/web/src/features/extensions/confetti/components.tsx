import { useEffect } from "react";

import type { ConfettiExtensionPayload } from "./index";
import { presetById } from "./presets";

interface ConfettiExtensionComponentProps {
  payload: ConfettiExtensionPayload;
}

export function ConfettiExtensionComponent({ payload }: ConfettiExtensionComponentProps) {
  const preset = presetById(payload?.preset ?? "cannon");

  useEffect(() => {
    if (!preset) return undefined;
    return preset.fire();
  }, [preset]);

  return null;
}
