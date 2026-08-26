import {
  type Hotkey,
  type HotkeySequence,
  useHotkeyRecorder,
  useHotkeySequenceRecorder,
} from "@tanstack/vue-hotkeys";

/**
 * Records a single-chord binding. `onCommit` fires with the captured hotkey
 * (or `onClear` when Backspace/Delete is pressed with no steps). While
 * recording, `ignoreInputs` is disabled so the capture works even if focus is
 * in a text field.
 */
export function useSingleRecorder(onCommit: (hotkey: Hotkey) => void) {
  return useHotkeyRecorder({
    ignoreInputs: false,
    onRecord: (hotkey) => onCommit(hotkey),
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
