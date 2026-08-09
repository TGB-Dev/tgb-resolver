import confetti from "canvas-confetti";

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export type ConfettiCleanup = () => void;

export interface ConfettiPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  fire(): ConfettiCleanup;
}

const DURATION_MS = 15 * 1000;

function fireCannon(): ConfettiCleanup {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
  return () => undefined;
}

function fireRandom(): ConfettiCleanup {
  confetti({
    angle: randomInRange(55, 125),
    spread: randomInRange(50, 70),
    particleCount: randomInRange(50, 100),
    origin: { y: 0.6 },
  });
  return () => undefined;
}

function fireRealistic(): ConfettiCleanup {
  const count = 200;
  const defaults = { origin: { y: 0.7 } };

  const fire = (particleRatio: number, opts: Parameters<typeof confetti>[0]) => {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  };

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });

  return () => undefined;
}

function fireFireworks(): ConfettiCleanup {
  const animationEnd = Date.now() + DURATION_MS;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / DURATION_MS);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);

  return () => clearInterval(interval);
}

function fireSnow(): ConfettiCleanup {
  const animationEnd = Date.now() + DURATION_MS;
  let skew = 1;
  let frameId = 0;

  const frame = () => {
    const timeLeft = animationEnd - Date.now();
    const ticks = Math.max(200, 500 * (timeLeft / DURATION_MS));
    skew = Math.max(0.8, skew - 0.001);

    confetti({
      particleCount: 1,
      startVelocity: 0,
      ticks,
      origin: {
        x: Math.random(),
        y: Math.random() * skew - 0.2,
      },
      colors: ["#ffffff"],
      shapes: ["circle"],
      gravity: randomInRange(0.4, 0.6),
      scalar: randomInRange(0.4, 1),
      drift: randomInRange(-0.4, 0.4),
    });

    if (timeLeft > 0) {
      frameId = requestAnimationFrame(frame);
    }
  };

  frame();

  return () => cancelAnimationFrame(frameId);
}

function fireStars(): ConfettiCleanup {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    colors: ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
  };

  const shoot = () => {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ["star"],
    });
    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ["circle"],
    });
  };

  const timeouts = [0, 100, 200].map((delay) => setTimeout(shoot, delay));

  return () => {
    timeouts.forEach((t) => {
      clearTimeout(t);
    });
  };
}

function fireContinuous(): ConfettiCleanup {
  const end = Date.now() + DURATION_MS;
  const colors = ["#bb0000", "#ffffff"];
  let frameId = 0;

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      frameId = requestAnimationFrame(frame);
    }
  };

  frame();

  return () => cancelAnimationFrame(frameId);
}

function fireEmoji(): ConfettiCleanup {
  const scalar = 2;
  const unicorn = confetti.shapeFromText({ text: "🦄", scalar });

  const defaults = {
    spread: 360,
    ticks: 60,
    gravity: 0,
    decay: 0.96,
    startVelocity: 20,
    shapes: [unicorn] as confetti.Shape[],
    scalar,
  };

  const shoot = () => {
    confetti({ ...defaults, particleCount: 30 });
    confetti({ ...defaults, particleCount: 5, flat: true });
    confetti({
      ...defaults,
      particleCount: 15,
      scalar: scalar / 2,
      shapes: ["circle"],
    });
  };

  const timeouts = [0, 100, 200].map((delay) => setTimeout(shoot, delay));

  return () => {
    timeouts.forEach((t) => {
      clearTimeout(t);
    });
  };
}

export const confettiPresets: readonly ConfettiPreset[] = [
  {
    id: "cannon",
    label: "Basic Cannon",
    description: "A single, classic blast of confetti.",
    fire: fireCannon,
  },
  {
    id: "random",
    label: "Random Direction",
    description: "Random amounts and directions of confetti.",
    fire: fireRandom,
  },
  {
    id: "realistic",
    label: "Realistic Look",
    description: "Mixed particle ratios for a natural spread.",
    fire: fireRealistic,
  },
  {
    id: "fireworks",
    label: "Fireworks",
    description: "Rapid-fire bursts from the sides for 15s.",
    fire: fireFireworks,
  },
  {
    id: "stars",
    label: "Stars",
    description: "A celebratory burst of stars and circles.",
    fire: fireStars,
  },
  {
    id: "snow",
    label: "Snow",
    description: "Gentle, falling snowflakes across the screen.",
    fire: fireSnow,
  },
  {
    id: "continuous",
    label: "Continuous Cannons",
    description: "Two confetti cannons from both sides for 15s.",
    fire: fireContinuous,
  },
  { id: "emoji", label: "Emoji", description: "A burst of unicorn emoji shapes.", fire: fireEmoji },
];

export function presetById(id: string): ConfettiPreset | undefined {
  return confettiPresets.find((preset) => preset.id === id);
}
