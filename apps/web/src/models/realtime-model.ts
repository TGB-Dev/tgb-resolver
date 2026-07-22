import { createModel, type Signal, signal } from "@preact/signals-react";
import { ShowConnectionStatus } from "@tgb-resolver/realtime";

interface RealtimeModelState {
  connectionStatus: Signal<ShowConnectionStatus>;
  bigRefetching: Signal<boolean>;
}

const RealtimeModel = createModel<RealtimeModelState>(() => {
  const connectionStatus = signal<ShowConnectionStatus>(ShowConnectionStatus.Connecting);
  const bigRefetching = signal(false);
  return {
    connectionStatus,
    bigRefetching,
  };
});

export const realtimeModel = new RealtimeModel();
