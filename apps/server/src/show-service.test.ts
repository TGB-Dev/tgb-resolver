import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync } from "node:zlib";
import { createEmptyShow, type ShowFile } from "@tgb-resolver/contracts";
import tar from "tar-stream";
import { describe, expect, test } from "vitest";
import { ShowRepository } from "./show-repository";
import { ShowService, ShowServiceError } from "./show-service";

function createService(show?: ShowFile) {
  const dir = mkdtempSync(join(tmpdir(), "tgb-resolver-"));
  const repository = new ShowRepository({
    dbPath: join(dir, "resolver.db"),
    assetDir: join(dir, "assets"),
  });
  const service = new ShowService(repository);
  if (show) {
    service.replaceShow(show, show.meta.source ?? "manual");
  }
  return { service, repository };
}

function createSampleShow() {
  return createEmptyShow({
    meta: {
      title: "Sample",
      source: "manual",
    },
    assets: {
      images: [
        {
          id: "img-1",
          kind: "image",
          fileName: "img-1.png",
          originalName: "img-1.png",
          contentType: "image/png",
          sizeBytes: 100,
          xxh364: "img-1",
        },
      ],
      sfx: [
        {
          id: "sfx-1",
          kind: "sfx",
          fileName: "sfx-1.mp3",
          originalName: "sfx-1.mp3",
          contentType: "audio/mpeg",
          sizeBytes: 200,
          xxh364: "sfx-1",
        },
      ],
    },
    timeline: [
      {
        id: 1,
        type: "RES",
        payload: {
          realName: "Alice Team",
          username: "alice",
          problem: "A",
          newScore: 100,
          newRank: 1,
        },
      },
      {
        id: 2,
        type: "SFX",
        payload: {
          sfxId: "sfx-1",
          durationSeconds: 3,
        },
      },
      {
        id: 3,
        type: "IMG",
        payload: {
          imageId: "img-1",
          durationSeconds: 4,
        },
      },
      {
        id: 4,
        type: "RES",
        payload: {
          realName: "Bob Team",
          username: "bob",
          problem: "B",
          newScore: 200,
          newRank: 1,
        },
      },
    ],
  });
}

describe("ShowService", () => {
  test("persists replacements and bumps showVersion monotonically", () => {
    const { service } = createService();
    const first = service.replaceShow(createSampleShow(), "manual");
    const second = service.setLiveMode("live");

    expect(second.showVersion).toBeGreaterThan(first.showVersion);
    expect(service.getShow().mode).toBe("live");
  });

  test("executes resolve-driven playback segments", () => {
    const { service } = createService(createSampleShow());
    const start = service.startPlayback(service.getShow().showVersion);

    expect(start.playback.currentResolveEventId).toBe(1);
    expect(start.playback.currentEventId).toBe(1);

    const next = service.continueSegment(start.showVersion);
    expect(next.playback.currentEventId).toBe(2);
  });

  test("rejects deleting resolve events while allowing non-resolve deletes", () => {
    const { service } = createService(createSampleShow());
    const show = service.getShow();

    expect(() => service.deleteNonResolveEvent(1, show.showVersion)).toThrow(ShowServiceError);

    const accepted = service.deleteNonResolveEvent(2, show.showVersion);
    expect(accepted.timeline).toHaveLength(3);
  });

  test("replacing a show removes old unreferenced asset files", () => {
    const { service, repository } = createService();
    const firstAsset = service.uploadAsset({
      kind: "image",
      id: "first",
      originalName: "first.png",
      contentType: "image/png",
      bytes: Buffer.from("first"),
    });
    const firstShow = createEmptyShow({
      meta: { title: "First", source: "manual" },
      assets: { images: [firstAsset], sfx: [] },
      timeline: [{ id: 1, type: "IMG", payload: { imageId: firstAsset.id } }],
    });
    service.replaceShow(firstShow, "manual");
    expect(existsSync(join(repository.assetDir, firstAsset.fileName))).toBe(true);

    const secondAsset = service.uploadAsset({
      kind: "image",
      id: "second",
      originalName: "second.png",
      contentType: "image/png",
      bytes: Buffer.from("second"),
    });
    const secondShow = createEmptyShow({
      meta: { title: "Second", source: "manual" },
      assets: { images: [secondAsset], sfx: [] },
      timeline: [{ id: 1, type: "IMG", payload: { imageId: secondAsset.id } }],
    });
    service.replaceShow(secondShow, "manual");

    expect(existsSync(join(repository.assetDir, firstAsset.fileName))).toBe(false);
    expect(existsSync(join(repository.assetDir, secondAsset.fileName))).toBe(true);
  });

  test("clear show resets persisted state and removes referenced asset files", () => {
    const { service, repository } = createService();
    const asset = service.uploadAsset({
      kind: "sfx",
      id: "stinger",
      originalName: "stinger.mp3",
      contentType: "audio/mpeg",
      bytes: Buffer.from("stinger"),
    });

    const show = createEmptyShow({
      meta: { title: "Loaded", source: "manual" },
      assets: { images: [], sfx: [asset] },
      timeline: [{ id: 1, type: "SFX", payload: { sfxId: asset.id } }],
    });
    service.replaceShow(show, "manual");
    const currentVersion = service.getShow().showVersion;

    const cleared = service.clearShow(currentVersion);
    expect(cleared.timeline).toHaveLength(0);
    expect(cleared.assets.images).toHaveLength(0);
    expect(cleared.assets.sfx).toHaveLength(0);
    expect(existsSync(join(repository.assetDir, asset.fileName))).toBe(false);
  });

  test("read-only mode blocks loading a new show from XML and ZIP", async () => {
    const { service } = createService(createSampleShow());
    service.setLiveMode("live");

    expect(() => service.importXml("<contest></contest>")).toThrow(ShowServiceError);

    const bundleBytes = await createBundledShowBytes(createEmptyShow(), []);
    await expect(service.importBundle(bundleBytes)).rejects.toBeInstanceOf(ShowServiceError);
  });

  test("rejects negative duration on non-resolve mutations", () => {
    const { service } = createService(createSampleShow());
    const show = service.getShow();

    expect(() =>
      service.patchNonResolveEvent(2, show.showVersion, {
        payload: {
          durationSeconds: -0.5,
        },
      }),
    ).toThrow(ShowServiceError);

    expect(() =>
      service.insertNonResolveEvent(show.showVersion, {
        id: 5,
        type: "IMG",
        payload: {
          imageId: "img-1",
          durationSeconds: -1,
        },
      }),
    ).toThrow(ShowServiceError);
  });
});

async function createBundledShowBytes(
  show: ShowFile,
  assets: Array<{ path: string; bytes: Buffer }>,
): Promise<Buffer> {
  const pack = tar.pack();
  const archivePromise = collectPack(pack);

  pack.entry({ name: "show.json" }, JSON.stringify(show));
  for (const asset of assets) {
    pack.entry({ name: asset.path, size: asset.bytes.length }, asset.bytes);
  }
  pack.finalize();

  return brotliCompressSync(await archivePromise);
}

async function collectPack(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
