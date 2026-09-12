import type {
  ConflictBehavior,
  HotkeyCallback,
  HotkeySequence,
  RegisterableHotkey,
} from "@tanstack/vue-hotkeys";

/**
 * A named group of commands. Scopes gate whether a command's hotkey is
 * registered; `Global` is always active, while feature scopes are activated
 * by route or by features pushing transient scopes. Add new members here
 * (not as a string union) — see the AGENTS.md enum convention.
 */
export enum CommandScope {
  Global = "global",
  Control = "control",
  Timeline = "timeline",
  Assets = "assets",
  Leaderboard = "leaderboard",
  Extensions = "extensions",
}

/**
 * Discriminant for {@link CommandBinding}. New binding shapes are added as new
 * enum members, never as ad-hoc string literals.
 */
export enum CommandBindingKind {
  Hotkey = "hotkey",
  Sequence = "sequence",
  None = "none",
}

/**
 * The binding assigned to a command. Kept separate from the command itself so
 * users can customize the key without touching the action.
 *
 * - `Hotkey`  — a single chord (e.g. `Mod+S`)
 * - `Sequence` — a Vim-style chord sequence (e.g. `['G', 'G']`)
 * - `None`    — unassigned (the command stays listed but inert)
 */
export type CommandBinding =
  | { kind: CommandBindingKind.Hotkey; hotkey: RegisterableHotkey }
  | { kind: CommandBindingKind.Sequence; sequence: HotkeySequence }
  | { kind: CommandBindingKind.None };

/**
 * Stable identifiers for every command. Adding a command requires adding its
 * id here; `CommandDefinition.id` is narrowed to this union so the bindings
 * store and overlay stay in sync.
 */
export type CommandId =
  | "open-shortcuts"
  | "toggle-color-mode"
  | "toggle-fullscreen"
  | "play-toggle"
  | "cue-next"
  | "cue-prev"
  | "reset-playback"
  | "timeline-jump-top"
  | "timeline-jump-bottom"
  | "control-tab-preview"
  | "control-tab-assets"
  | "control-tab-cue"
  | "control-tab-info"
  | "control-tab-settings"
  | "control-tab-auth"
  | "transport-prev"
  | "transport-next"
  | "assets-delete"
  | "assets-rename"
  | "assets-upload"
  | "assets-copy"
  | "assets-cut"
  | "assets-paste"
  | "assets-create-folder";

export interface CommandDefinition {
  /** Stable identifier. Never changes; this is what bindings are keyed by. */
  id: CommandId;
  /** Human-readable label shown in the shortcuts table. */
  title: string;
  /** Longer explanation shown under the title. */
  description?: string;
  /** Scope that must be active for the hotkey to be live. */
  scope: CommandScope;
  /** Grouping label for the overlay table. */
  category: string;
  /** The out-of-the-box binding (overridable by the user). */
  defaultBinding: CommandBinding;
  /** Per-command conflict policy. Defaults to `warn` at registration time. */
  conflictBehavior?: ConflictBehavior;
  /** The action performed when the binding fires. */
  handler: HotkeyCallback;
}
