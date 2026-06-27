import { createEmptyShow, type ShowFile } from "@tgb-resolver/contracts";
import Database from "better-sqlite3";

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DEFAULT_DATA_DIR = join(process.cwd(), ".data");
const DEFAULT_DB_PATH = join(DEFAULT_DATA_DIR, "resolver.db");

export interface ShowRepositoryOptions {
  dbPath?: string;
  assetDir?: string;
}

interface AppStateRow {
  id: number;
  show_version: number;
  mode: ShowFile["mode"];
  playback_json: string;
  automation_json: string;
}

interface ShowDocumentRow {
  id: number;
  show_json: string;
}

export class ShowRepository {
  public readonly db: Database.Database;
  public readonly assetDir: string;

  constructor(options: ShowRepositoryOptions = {}) {
    const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
    this.assetDir = options.assetDir ?? join(dirname(dbPath), "assets");
    mkdirSync(dirname(dbPath), { recursive: true });
    mkdirSync(this.assetDir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
    this.seed();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        show_version INTEGER NOT NULL,
        mode TEXT NOT NULL,
        playback_json TEXT NOT NULL,
        automation_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS show_document (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        show_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        xxh364 TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  private seed() {
    const show = createEmptyShow();
    this.db
      .prepare(
        `INSERT OR IGNORE INTO app_state (id, show_version, mode, playback_json, automation_json)
         VALUES (1, @showVersion, @mode, @playback, @automation)`,
      )
      .run({
        showVersion: show.showVersion,
        mode: show.mode,
        playback: JSON.stringify(show.playback),
        automation: JSON.stringify(show.automation),
      });
    this.db
      .prepare(`INSERT OR IGNORE INTO show_document (id, show_json) VALUES (1, @showJson)`)
      .run({ showJson: JSON.stringify(show) });
  }

  getShow(): ShowFile {
    const state = this.db.prepare(`SELECT * FROM app_state WHERE id = 1`).get() as AppStateRow;
    const document = this.db
      .prepare(`SELECT * FROM show_document WHERE id = 1`)
      .get() as ShowDocumentRow;
    const show = JSON.parse(document.show_json) as ShowFile;

    return {
      ...show,
      showVersion: state.show_version,
      mode: state.mode,
      playback: JSON.parse(state.playback_json),
      automation: JSON.parse(state.automation_json),
    };
  }

  saveShow(show: ShowFile) {
    const save = this.db.transaction((nextShow: ShowFile) => {
      this.db
        .prepare(
          `UPDATE app_state SET show_version = @showVersion, mode = @mode, playback_json = @playback, automation_json = @automation WHERE id = 1`,
        )
        .run({
          showVersion: nextShow.showVersion,
          mode: nextShow.mode,
          playback: JSON.stringify(nextShow.playback),
          automation: JSON.stringify(nextShow.automation),
        });

      this.db.prepare(`UPDATE show_document SET show_json = @showJson WHERE id = 1`).run({
        showJson: JSON.stringify(nextShow),
      });

      this.db.prepare(`DELETE FROM assets`).run();
      const insertAsset = this.db.prepare(`
        INSERT INTO assets (id, kind, file_name, original_name, content_type, size_bytes, xxh364, created_at)
        VALUES (@id, @kind, @fileName, @originalName, @contentType, @sizeBytes, @xxh364, @createdAt)
      `);

      for (const asset of [...nextShow.assets.images, ...nextShow.assets.sfx]) {
        insertAsset.run({
          ...asset,
          createdAt: Date.now(),
        });
      }
    });

    save(show);
  }

  saveAssetFile(fileName: string, bytes: Uint8Array) {
    const path = join(this.assetDir, fileName);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
    return path;
  }

  readAssetFile(fileName: string): Buffer {
    return readFileSync(join(this.assetDir, fileName));
  }

  deleteAssetFile(fileName: string) {
    rmSync(join(this.assetDir, fileName), { force: true });
  }

  listAssetFiles(): string[] {
    return readdirSync(this.assetDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  }
}
