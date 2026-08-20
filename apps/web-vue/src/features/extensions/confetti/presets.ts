import confetti from "canvas-confetti";
export const confettiPresets = [{ id: "cannon", label: "Cannon", description: "A single burst." }];
export function presetById(id: string) {
  return confettiPresets.find((preset) => preset.id === id);
}
export function fireConfetti() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  return () => undefined;
}
