import { createModel, type ReadonlySignal, signal } from "@preact/signals-react";

import { getServerNow } from "@/lib/realtime-client";

interface ControlNowModel {
  now: ReadonlySignal<number>;
  setNow: (now: number) => void;
}

const ControlNowModel = createModel<ControlNowModel>(() => {
  const now = signal(getServerNow());

  return {
    now,
    setNow(value: number) {
      now.value = value;
    },
  };
});

export const controlNowModel = new ControlNowModel();
