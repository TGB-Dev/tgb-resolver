import type {
  LiveModeChangedMessage,
  PlaybackStateChangedMessage,
  ShowRefetchRequiredMessage,
} from "../TGB.Resolver.Server.Features.Realtime";
import type { ClockSyncRequest, ClockSyncResponse } from "../TGB.Resolver.Server.Features.Show.Dto";

export type IShowHub = {
  /**
   * @param request Transpiled from TGB.Resolver.Server.Features.Show.Dto.ClockSyncRequest
   * @returns Transpiled from System.Threading.Tasks.Task<TGB.Resolver.Server.Features.Show.Dto.ClockSyncResponse>
   */
  syncClock(request: ClockSyncRequest): Promise<ClockSyncResponse>;
};

export type IShowHubClient = {
  /**
   * @param message Transpiled from TGB.Resolver.Server.Features.Realtime.ShowRefetchRequiredMessage
   * @returns Transpiled from System.Threading.Tasks.Task
   */
  showRefetchRequired(message: ShowRefetchRequiredMessage): Promise<void>;
  /**
   * @param message Transpiled from TGB.Resolver.Server.Features.Realtime.PlaybackStateChangedMessage
   * @returns Transpiled from System.Threading.Tasks.Task
   */
  playbackStateChanged(message: PlaybackStateChangedMessage): Promise<void>;
  /**
   * @param message Transpiled from TGB.Resolver.Server.Features.Realtime.LiveModeChangedMessage
   * @returns Transpiled from System.Threading.Tasks.Task
   */
  liveModeChanged(message: LiveModeChangedMessage): Promise<void>;
};
