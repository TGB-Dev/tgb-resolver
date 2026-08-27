import {
  type HotkeySequence,
  useHotkeyRecorder,
  useHotkeySequenceRecorder,
} from "@tanstack/vue-hotkeys";

/**
 * Records a single-chord binding. The captured chord lives in `recordedHotkey`;
 * the caller commits it (e.g. on stop) by reading that value. `ignoreInputs` is
 * disabled so the capture works even when focus is in a text field. `onRecord`
 * is required by the API but is a no-op here (the row handles the commit).
 */
export function useSingleRecorder() {
  return useHotkeyRecorder({
    ignoreInputs: false,
    onRecord: () => {},
  });
}

/**
 * Records a multi-chord sequence. Press Enter (no modifiers) to commit, Escape
 * to cancel. `onCommit` receives the captured sequence of chords.
 */
export function useSequenceRecorder(onCommit: (sequence: HotkeySequence) => void) {
  return useHotkeySequenceRecorder({
    ignoreInputs: false,
    commitKeys: "enter",
    onRecord: (sequence) => onCommit(sequence),
  });
}
