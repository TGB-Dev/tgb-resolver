/**
 * A random source returns a pseudo-random number in the half-open interval [0, 1).
 */
export type RandomSource = () => number;

const DEFAULT_STATE = Object.freeze([0x9e3779b9, 0x243f6a88, 0xb7e15162, 0xdeadbeef]) as readonly [
  number,
  number,
  number,
  number,
];

function hashStringToUint32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function deriveState(seed: number): readonly [number, number, number, number] {
  const h = hashStringToUint32(String(seed));
  return [
    h,
    Math.imul(h, 0x85ebca6b) >>> 0,
    (Math.imul(h ^ 0xffffffff, 0xc2b2ae35) >>> 0) ^ 0x27d4eb2f,
    (Math.imul(h, 0x165667b1) >>> 0) ^ 0x9e3779b9,
  ];
}

/**
 * Deterministic sfc32 pseudo-random generator.
 *
 * Omitting `seed` (or passing `undefined`) always produces the same default sequence, so
 * callers get reproducible randomness out of the box. A numeric seed produces a stable but
 * different sequence. Pass a 4-tuple of uint32 to take full control of the PRNG state.
 */
export function seedSfc32(seed?: number | readonly [number, number, number, number]): RandomSource {
  let [a, b, c, d] =
    seed === undefined ? DEFAULT_STATE : typeof seed === "number" ? deriveState(seed) : seed;

  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
