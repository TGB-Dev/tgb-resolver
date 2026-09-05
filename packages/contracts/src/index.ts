export * from "./generated/@tanstack/vue-query.gen";
export { client as generatedClient } from "./generated/client.gen";
export type { Options } from "./generated/sdk.gen";
export {
  tgbResolverServerFeaturesAssetsCreateFolderEndpoint as createFolderEndpoint,
  tgbResolverServerFeaturesAssetsDeleteEntryEndpoint as deleteEntryEndpoint,
  tgbResolverServerFeaturesAssetsMoveAssetEndpoint as moveAssetEndpoint,
  tgbResolverServerFeaturesAssetsPutAssetEndpoint as uploadAssetEndpoint,
  tgbResolverServerFeaturesAssetsRenameEntryEndpoint as renameEntryEndpoint,
  tgbResolverServerFeaturesAssetsTransferEntryEndpoint as transferEntryEndpoint,
  tgbResolverServerFeaturesShowClearShowEndpoint as clearShow,
  tgbResolverServerFeaturesShowCreateTimelineEventEndpoint as createTimelineEvent,
  tgbResolverServerFeaturesShowDeleteTimelineEventEndpoint as deleteTimelineEvent,
  tgbResolverServerFeaturesShowDisableLiveModeEndpoint as disableLiveMode,
  tgbResolverServerFeaturesShowEnableLiveModeEndpoint as enableLiveMode,
  tgbResolverServerFeaturesShowExportBundleEndpoint as exportShowBundle,
  tgbResolverServerFeaturesShowGetShowEndpoint as getShow,
  tgbResolverServerFeaturesShowImportBundleEndpoint as importShowBundle,
  tgbResolverServerFeaturesShowImportXmlEndpoint as importShowXml,
  tgbResolverServerFeaturesShowImportXmlUsersEndpoint as importShowXmlUsers,
  tgbResolverServerFeaturesShowMoveTimelineEventEndpoint as moveTimelineEvent,
  tgbResolverServerFeaturesShowOptimizeShowEndpoint as optimizeShow,
  tgbResolverServerFeaturesShowPatchNonResolveEventEndpoint as patchNonResolveEvent,
  tgbResolverServerFeaturesShowPatchTimelineEventEndpoint as patchTimelineEvent,
  tgbResolverServerFeaturesShowRenameResolveEventEndpoint as renameResolveEvent,
  tgbResolverServerFeaturesShowResetPlaybackEndpoint as resetPlayback,
  tgbResolverServerFeaturesShowSeekPlaybackEndpoint as seekPlayback,
  tgbResolverServerFeaturesShowSetAutomationEndpoint as setAutomation,
  tgbResolverServerFeaturesShowSetSettingsEndpoint as setSettings,
  tgbResolverServerFeaturesShowStartPlaybackEndpoint as startPlayback,
} from "./generated/sdk.gen";
export type {
  ClientOptions,
  CreateFolderRequest,
  CreateTimelineEventRequest,
  DeleteEntryRequest,
  ImportBundleRequest,
  ImportXmlRequest,
  ImportXmlUser,
  ImportXmlUsersRequest,
  MoveAssetRequest,
  MoveTimelineEventRequest,
  NonResolveEventPatchRequest,
  PatchTimelineEventRequest,
  RenameEntryRequest,
  ResolveEventRenameRequest,
  SeekPlaybackRequest,
  SetAutomationRequest,
  SetSettingsRequest,
  SetTimelineModeRequest,
  TransferEntryRequest,
  UpsertAssetRequest,
  VersionedCommandRequest,
} from "./generated/types.gen";
export type {
  AssetCollection as AssetCollectionSnapshot,
  AutomationState as AutomationSnapshot,
  ContestState as ContestSnapshot,
  CustomEventPayload as CustomEventPayloadSnapshot,
  FolderNode as FolderNodeSnapshot,
  FreezeSnapshotEntry as FreezeSnapshotEntrySnapshot,
  PlaybackState as PlaybackStateSnapshot,
  ProblemDefinition as ProblemDefinitionSnapshot,
  ProblemFreezeResult as ProblemFreezeResultSnapshot,
  ResolveEventPayload as ResolveEventPayloadSnapshot,
  ShowAsset as ShowAssetSnapshot,
  ShowMeta as ShowMetaSnapshot,
  ShowState as ShowStateSnapshot,
  TimelineEvent as TimelineEventSnapshot,
  UserDefinition as UserDefinitionSnapshot,
} from "./generated/types.gen";
export enum PlaybackStatus {
  IDLE = "Idle",
  RUNNING = "Running",
  PAUSED = "Paused",
}
export enum ShowMode {
  EDITING = "Editing",
  LIVE = "Live",
}
export enum ShowSource {
  XML = "Xml",
  BUNDLE = "Bundle",
  MANUAL = "Manual",
}
export enum TimelineEventType {
  RES = "Res",
  PRE = "Pre",
  CUS = "Cus",
  IMG = "Img",
  SFX = "Sfx",
}
export enum TimelineMode {
  RW = "Rw",
  RO = "Ro",
}
export enum VerdictRunResult {
  UNKNOWN = "Unknown",
  ACCEPTED = "Accepted",
  WRONG_ANSWER = "WrongAnswer",
  TIME_LIMIT_EXCEEDED = "TimeLimitExceeded",
  MEMORY_LIMIT_EXCEEDED = "MemoryLimitExceeded",
  OUTPUT_LIMIT_EXCEEDED = "OutputLimitExceeded",
  INVALID_RETURN = "InvalidReturn",
  RUNTIME_ERROR = "RuntimeError",
  COMPILE_ERROR = "CompileError",
  INTERNAL_ERROR = "InternalError",
  SHORT_CIRCUITED = "ShortCircuited",
  ABORTED = "Aborted",
  UNRESOLVED = "Unresolved",
  PENDING = "Pending",
}
export * from "./generated/valibot.gen";
