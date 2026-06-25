import { createRequire } from "node:module";
import { basename, extname } from "node:path";
import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from "node:zlib";
import {
  buildPlaybackSegments,
  createEmptyShow,
  getSegmentForResolveEventId,
  isNonResolveEvent,
  type NonResolveEventPatch,
  normalizeShow,
  optimizeShow,
  type PlaybackSegment,
  type PlaySfxEvent,
  type ResolveEventPatch,
  type ShowAsset,
  type ShowFile,
  type ShowImageEvent,
  type ShowServiceErrorReason,
  type ShowWebSocketMessage,
  type TimelineEvent,
  validateShow,
} from "@tgb-resolver/contracts";
import { parseIcpcXml } from "@tgb-resolver/icpc-xml-parser";
import tar from "tar-stream";
import { ShowRepository } from "./show-repository";
import { convertIcpcContestToShow } from "./xml-to-show";

const require = createRequire(import.meta.url);
const { XXHash3 } = require("xxhash-addon"); // This requires a native addon. See https://github.com/ktrongnhan/xxhash-addon/issues/35

export interface UploadAssetInput {
  kind: ShowAsset["kind"];
  id: string;
  originalName: string;
  contentType: string;
  bytes: Uint8Array;
}

export class ShowServiceError extends Error {
  constructor(
    public readonly reason: ShowServiceErrorReason,
    public readonly showVersion: number,
    message: string,
  ) {
    super(message);
    this.name = "ShowServiceError";
  }
}

export class ShowService {
  private readonly repository: ShowRepository;
  private readonly listeners = new Set<(message: ShowWebSocketMessage) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(repository = new ShowRepository()) {
    this.repository = repository;
  }

  subscribe(listener: (message: ShowWebSocketMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private broadcast(message: ShowWebSocketMessage) {
    for (const listener of this.listeners) {
      listener(message);
    }
  }

  getShow() {
    return normalizeShow(this.repository.getShow());
  }

  private nextShowVersion(previousVersion: number) {
    const now = Date.now();
    return now > previousVersion ? now : previousVersion + 1;
  }

  private saveAndBroadcast(show: ShowFile, message?: ShowWebSocketMessage) {
    this.pruneAssetFiles(show);
    this.repository.saveShow(show);
    if (message) {
      this.broadcast(message);
    }
    return show;
  }

  private ensureMutable(show: ShowFile) {
    if (show.mode === "live") {
      throw new ShowServiceError("readonly", show.showVersion, "Show is in live mode");
    }
  }

  private ensureVersion(show: ShowFile, showVersion: number) {
    if (show.showVersion !== showVersion) {
      this.broadcast({
        type: "show-refetch-required",
        showVersion: show.showVersion,
        reason: "version_drift",
      });
      throw new ShowServiceError("version_drift", show.showVersion, "Client showVersion is stale");
    }
  }

  replaceShow(nextShow: ShowFile, source: ShowFile["meta"]["source"]): ShowFile {
    this.clearTimer();
    const currentShow = this.getShow();
    const replacedShow = normalizeShow({
      ...createEmptyShow({
        ...nextShow,
        meta: {
          ...nextShow.meta,
          source,
        },
      }),
      showVersion: this.nextShowVersion(currentShow.showVersion),
    });

    return this.saveAndBroadcast(replacedShow, {
      type: "show-replaced",
      showVersion: replacedShow.showVersion,
      source,
    });
  }

  clearShow(showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);
    this.ensureMutable(show);

    const clearedShow = normalizeShow(
      createEmptyShow({
        showVersion: this.nextShowVersion(show.showVersion),
      }),
    );

    return this.saveAndBroadcast(clearedShow, {
      type: "show-replaced",
      showVersion: clearedShow.showVersion,
      source: "manual",
    });
  }

  importXml(xml: string) {
    const show = this.getShow();
    this.ensureMutable(show);

    const parsed = parseIcpcXml(xml);
    return this.replaceShow(convertIcpcContestToShow(parsed), "xml");
  }

  async importBundle(bytes: Uint8Array) {
    const show = this.getShow();
    this.ensureMutable(show);

    const archiveEntries = await extractTarEntries(brotliDecompressSync(Buffer.from(bytes)));
    const showEntry = archiveEntries.get("show.json");
    if (!showEntry) {
      throw new ShowServiceError(
        "invalid_request",
        show.showVersion,
        "Bundle is missing show.json",
      );
    }

    const importedShow = JSON.parse(showEntry.toString("utf-8")) as ShowFile;
    const issues = validateShow(importedShow);
    if (issues.length > 0) {
      throw new ShowServiceError("invalid_request", show.showVersion, issues.join("; "));
    }

    for (const asset of [...importedShow.assets.images, ...importedShow.assets.sfx]) {
      const assetPath = getBundleAssetPath(asset);
      const assetBytes = archiveEntries.get(assetPath);
      if (!assetBytes) {
        throw new ShowServiceError(
          "invalid_request",
          show.showVersion,
          `Bundle is missing asset file: ${assetPath}`,
        );
      }

      this.repository.saveAssetFile(asset.fileName, assetBytes);
    }

    return this.replaceShow(importedShow, "bundle");
  }

  async exportBundle() {
    const show = this.getShow();
    const archive = tar.pack();
    const archiveBufferPromise = collectWritableStream(archive);

    archive.entry({ name: "show.json" }, JSON.stringify(show));

    for (const asset of [...show.assets.images, ...show.assets.sfx]) {
      archive.entry(
        {
          name: getBundleAssetPath(asset),
          size: asset.sizeBytes,
        },
        this.repository.readAssetFile(asset.fileName),
      );
    }

    archive.finalize();
    const archiveBuffer = await archiveBufferPromise;

    return brotliCompressSync(archiveBuffer, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
      },
    });
  }

  uploadAsset(input: UploadAssetInput): ShowAsset {
    const xxh364 = computeXxh364(input.bytes);
    const extension = extname(input.originalName) || (input.kind === "image" ? ".bin" : ".bin");
    const fileName = `${xxh364}${extension}`;
    this.repository.saveAssetFile(fileName, input.bytes);

    return {
      id: input.id,
      kind: input.kind,
      fileName,
      originalName: basename(input.originalName),
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      xxh364,
    };
  }

  readAssetFile(fileName: string) {
    return this.repository.readAssetFile(fileName);
  }

  addAssetToShow(showVersion: number, asset: ShowAsset): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);
    this.ensureMutable(show);

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      assets: {
        ...show.assets,
        [asset.kind === "image" ? "images" : "sfx"]: [
          ...(asset.kind === "image" ? show.assets.images : show.assets.sfx).filter(
            (existing) => existing.id !== asset.id,
          ),
          asset,
        ],
      },
    };

    return this.saveAndBroadcast(nextShow, {
      type: "show-refetch-required",
      showVersion: nextShow.showVersion,
      reason: "optimized",
    });
  }

  optimize(showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);
    this.ensureMutable(show);

    const optimized = optimizeShow({
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
    });

    return this.saveAndBroadcast(optimized, {
      type: "show-refetch-required",
      showVersion: optimized.showVersion,
      reason: "optimized",
    });
  }

  setLiveMode(mode: ShowFile["mode"]) {
    const show = this.getShow();
    const nextShow = {
      ...show,
      mode,
      showVersion: this.nextShowVersion(show.showVersion),
    };

    return this.saveAndBroadcast(nextShow, {
      type: "live-mode-changed",
      showVersion: nextShow.showVersion,
      mode,
    });
  }

  patchResolveEvent(id: number, showVersion: number, patch: ResolveEventPatch): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);
    this.ensureMutable(show);
    const target = show.timeline.find((event) => event.id === id);
    if (!target) {
      throw new ShowServiceError("not_found", show.showVersion, `Event ${id} not found`);
    }

    const nextTimeline = show.timeline.map((event) => {
      if (event.id !== id) return event;
      if (event.type !== "RES") {
        throw new Error("Cannot patch a non-resolve event via resolve endpoint");
      }

      return {
        ...event,
        triggerOffsetSeconds: patch.triggerOffsetSeconds ?? event.triggerOffsetSeconds,
        requireManualInteraction: patch.requireManualInteraction ?? event.requireManualInteraction,
        customName: patch.customName ?? event.customName,
      };
    });

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      timeline: nextTimeline,
    };

    return this.saveAndBroadcast(nextShow);
  }

  patchNonResolveEvent(id: number, showVersion: number, patch: NonResolveEventPatch): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);
    this.ensureMutable(show);
    const target = show.timeline.find((event) => event.id === id);
    if (!target) {
      throw new ShowServiceError("not_found", show.showVersion, `Event ${id} not found`);
    }
    if (patch.payload?.durationSeconds !== undefined && patch.payload.durationSeconds < 0) {
      throw new ShowServiceError(
        "invalid_request",
        show.showVersion,
        "durationSeconds must be non-negative",
      );
    }

    const nextTimeline = show.timeline.map((event) => {
      if (event.id !== id) return event;
      if (!isNonResolveEvent(event)) {
        throw new Error("Cannot patch a resolve event via non-resolve endpoint");
      }

      const nextType = patch.type ?? event.type;
      const payloadSource = patch.payload ?? {};
      const nextPayload =
        nextType === "IMG"
          ? {
              imageId: payloadSource.imageId ?? (event.type === "IMG" ? event.payload.imageId : ""),
              durationSeconds:
                payloadSource.durationSeconds ??
                ("durationSeconds" in event.payload ? event.payload.durationSeconds : undefined),
            }
          : {
              sfxId: payloadSource.sfxId ?? (event.type === "SFX" ? event.payload.sfxId : ""),
              durationSeconds:
                payloadSource.durationSeconds ??
                ("durationSeconds" in event.payload ? event.payload.durationSeconds : undefined),
            };

      return {
        ...event,
        type: nextType,
        triggerOffsetSeconds: patch.triggerOffsetSeconds ?? event.triggerOffsetSeconds,
        requireManualInteraction: patch.requireManualInteraction ?? event.requireManualInteraction,
        customName: patch.customName ?? event.customName,
        payload: nextPayload,
      } as TimelineEvent;
    });

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      timeline: nextTimeline,
    };

    return this.saveAndBroadcast(nextShow);
  }

  insertNonResolveEvent(showVersion: number, event: ShowImageEvent | PlaySfxEvent): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);
    this.ensureMutable(show);

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      timeline: sortAndNormalizeTimeline([...show.timeline, event]),
    };

    if (getDurationSeconds(event) < 0) {
      throw new ShowServiceError(
        "invalid_request",
        show.showVersion,
        "durationSeconds must be non-negative",
      );
    }

    return this.saveAndBroadcast(nextShow);
  }

  deleteNonResolveEvent(id: number, showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);
    this.ensureMutable(show);

    const target = show.timeline.find((event) => event.id === id);
    if (!target) {
      throw new ShowServiceError("not_found", show.showVersion, `Event ${id} not found`);
    }
    if (!isNonResolveEvent(target)) {
      throw new ShowServiceError(
        "invalid_request",
        show.showVersion,
        "Resolve events cannot be deleted",
      );
    }

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      timeline: show.timeline.filter((event) => event.id !== id),
    };

    return this.saveAndBroadcast(nextShow);
  }

  setAutomation(showVersion: number, patch: Partial<ShowFile["automation"]>): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      automation: {
        ...show.automation,
        ...patch,
      },
    };

    const saved = this.saveAndBroadcast(nextShow);
    this.schedulePlayback(saved);
    return saved;
  }

  startPlayback(showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);

    const firstSegment = buildPlaybackSegments(show)[0];
    const nextShow = this.applySegmentState(show, firstSegment, "running");
    return this.savePlayback(nextShow, "start");
  }

  resetPlayback(showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      playback: {
        status: "idle",
      },
    };

    return this.savePlayback(nextShow, "reset");
  }

  pausePlayback(showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      playback: {
        ...show.playback,
        status: "paused",
      },
    };

    return this.savePlayback(nextShow, "pause");
  }

  nextResolve(showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);

    const segments = buildPlaybackSegments(show);
    const currentId = show.playback.currentResolveEventId;
    const nextSegment =
      currentId === undefined
        ? segments[0]
        : segments.find((segment) => segment.resolveEventId === currentId)?.nextResolveEventId ===
            undefined
          ? undefined
          : segments.find(
              (segment) =>
                segment.resolveEventId ===
                segments.find((candidate) => candidate.resolveEventId === currentId)
                  ?.nextResolveEventId,
            );

    if (!nextSegment) {
      throw new ShowServiceError("invalid_state", show.showVersion, "No next resolve event");
    }

    const nextShow = this.applySegmentState(show, nextSegment, "running");
    return this.savePlayback(nextShow, "next-resolve");
  }

  continueSegment(showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);

    const activeSegment = show.playback.activeSegment;
    if (!activeSegment) {
      throw new ShowServiceError("invalid_state", show.showVersion, "No active segment");
    }

    const nextInlineEventId = activeSegment.inlineEventIds[activeSegment.currentInlineIndex + 1];
    if (nextInlineEventId === undefined) {
      const nextShow = {
        ...show,
        showVersion: this.nextShowVersion(show.showVersion),
        playback: {
          ...show.playback,
          activeSegment: {
            ...activeSegment,
            currentInlineIndex: activeSegment.inlineEventIds.length,
          },
          currentEventId: activeSegment.nextResolveEventId ?? show.playback.currentResolveEventId,
          status: activeSegment.nextResolveEventId ? "running" : "completed",
        },
      };

      return this.savePlayback(nextShow, "continue-segment");
    }

    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      playback: {
        ...show.playback,
        currentEventId: nextInlineEventId,
        activeSegment: {
          ...activeSegment,
          currentInlineIndex: activeSegment.currentInlineIndex + 1,
        },
      },
    };

    return this.savePlayback(nextShow, "continue-segment");
  }

  jumpToEvent(eventId: number, showVersion: number): ShowFile {
    const show = this.getShow();
    this.ensureVersion(show, showVersion);

    const target = show.timeline.find((event) => event.id === eventId);
    if (!target) {
      throw new ShowServiceError("not_found", show.showVersion, "Event not found");
    }

    if (target.type === "RES") {
      const segment = getSegmentForResolveEventId(show, target.id);
      const nextShow = this.applySegmentState(show, segment, "running");
      return this.savePlayback(nextShow, "jump");
    }

    const parentSegment = buildPlaybackSegments(show).find((segment) =>
      segment.inlineEvents.some((event) => event.id === eventId),
    );
    const nextShow = {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      playback: {
        ...show.playback,
        status: "running",
        currentResolveEventId: parentSegment?.resolveEventId,
        currentEventId: eventId,
        activeSegment: parentSegment
          ? {
              resolveEventId: parentSegment.resolveEventId,
              nextResolveEventId: parentSegment.nextResolveEventId,
              inlineEventIds: parentSegment.inlineEvents.map((event) => event.id),
              currentInlineIndex: parentSegment.inlineEvents.findIndex(
                (event) => event.id === eventId,
              ),
            }
          : undefined,
      },
    };

    return this.savePlayback(nextShow, "jump");
  }

  private applySegmentState(
    show: ShowFile,
    segment: PlaybackSegment | undefined,
    status: ShowFile["playback"]["status"],
  ): ShowFile {
    return {
      ...show,
      showVersion: this.nextShowVersion(show.showVersion),
      playback: {
        status,
        currentResolveEventId: segment?.resolveEventId,
        currentEventId: segment?.resolveEventId,
        activeSegment: segment
          ? {
              resolveEventId: segment.resolveEventId,
              nextResolveEventId: segment.nextResolveEventId,
              inlineEventIds: segment.inlineEvents.map((event) => event.id),
              currentInlineIndex: -1,
            }
          : undefined,
        startedAt: Date.now(),
      },
    };
  }

  private savePlayback(show: ShowFile, command: string) {
    this.clearTimer();
    const saved = this.saveAndBroadcast(show, {
      type: "playback-state-changed",
      showVersion: show.showVersion,
      playback: show.playback,
    });
    this.broadcast({
      type: "command-applied",
      showVersion: saved.showVersion,
      command,
    });
    this.schedulePlayback(saved);
    return saved;
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedulePlayback(show: ShowFile) {
    this.clearTimer();

    if (show.playback.status !== "running") {
      return;
    }

    const activeSegment = show.playback.activeSegment;
    if (!activeSegment) {
      return;
    }

    const timelineById = new Map(show.timeline.map((event) => [event.id, event]));
    const currentEvent = show.playback.currentEventId
      ? timelineById.get(show.playback.currentEventId)
      : undefined;

    const schedule = (delayMs: number, action: () => void) => {
      this.timer = setTimeout(action, Math.max(0, delayMs));
    };

    if (activeSegment.currentInlineIndex < activeSegment.inlineEventIds.length - 1) {
      const nextInlineId = activeSegment.inlineEventIds[activeSegment.currentInlineIndex + 1];
      const nextInlineEvent = timelineById.get(nextInlineId);
      if (!nextInlineEvent || !isNonResolveEvent(nextInlineEvent)) {
        return;
      }
      if (nextInlineEvent.requireManualInteraction && !show.automation.fullAutoEnabled) {
        return;
      }

      const delayMs =
        ((nextInlineEvent.triggerOffsetSeconds ?? 0) + (getDurationSeconds(currentEvent) ?? 0)) *
        1000;
      schedule(delayMs, () => {
        const latest = this.getShow();
        if (latest.showVersion !== show.showVersion) return;
        void this.continueSegment(latest.showVersion);
      });
      return;
    }

    if (activeSegment.nextResolveEventId === undefined) {
      return;
    }

    if (!show.automation.autoResolveEnabled && !show.automation.fullAutoEnabled) {
      return;
    }

    schedule(show.automation.autoResolveSpeedMs, () => {
      const latest = this.getShow();
      if (latest.showVersion !== show.showVersion) return;
      void this.nextResolve(latest.showVersion);
    });
  }

  private pruneAssetFiles(show: ShowFile) {
    const usedFiles = new Set(
      [...show.assets.images, ...show.assets.sfx].map((asset) => asset.fileName),
    );
    for (const fileName of this.repository.listAssetFiles()) {
      if (!usedFiles.has(fileName)) {
        this.repository.deleteAssetFile(fileName);
      }
    }
  }
}

function getDurationSeconds(event: TimelineEvent | undefined) {
  if (!event || event.type === "RES") return 0;
  return event.payload.durationSeconds ?? 0;
}

function computeXxh364(bytes: Uint8Array): string {
  const candidate = XXHash3 as unknown as {
    hash?: (input: Uint8Array, seed?: bigint | number) => string | bigint | number;
    XXHash3?: new () => {
      update: (input: Uint8Array) => void;
      digest: (encoding?: string) => string | Uint8Array;
    };
  };

  if (typeof candidate.hash === "function") {
    return String(candidate.hash(bytes));
  }

  const HashClass =
    candidate.XXHash3 ??
    (XXHash3 as unknown as new () => {
      update: (input: Uint8Array) => void;
      digest: (encoding?: string) => string | Uint8Array;
    });
  const hash = new HashClass();
  hash.update(bytes);
  const digest = hash.digest("hex");
  return typeof digest === "string" ? digest : Buffer.from(digest).toString("hex");
}

function getBundleAssetPath(asset: ShowAsset) {
  return `${asset.kind === "image" ? "assets/images" : "assets/sfx"}/${asset.fileName}`;
}

async function collectWritableStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

async function extractTarEntries(bytes: Uint8Array): Promise<Map<string, Buffer>> {
  const extract = tar.extract();
  const entries = new Map<string, Buffer>();

  return new Promise<Map<string, Buffer>>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer | Uint8Array | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on("error", reject);
      stream.on("end", () => {
        entries.set(header.name, Buffer.concat(chunks));
        next();
      });
      stream.resume();
    });
    extract.on("error", reject);
    extract.on("finish", () => resolve(entries));
    extract.end(bytes);
  });
}

function sortAndNormalizeTimeline(timeline: TimelineEvent[]) {
  return timeline
    .slice()
    .sort((left, right) => left.id - right.id)
    .map((event) => ({
      ...event,
      triggerOffsetSeconds: event.triggerOffsetSeconds ?? 0,
      requireManualInteraction: event.requireManualInteraction ?? false,
    }));
}
