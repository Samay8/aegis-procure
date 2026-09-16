/** Deterministic PRNG so the synthetic universe is identical on server and client. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next: () => number;
  float: (min?: number, max?: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  chance: (p: number) => boolean;
  normal: (mean?: number, sd?: number) => number;
  shuffle: <T>(arr: readonly T[]) => T[];
  sample: <T>(arr: readonly T[], n: number) => T[];
  weighted: <T>(items: readonly (readonly [T, number])[]) => T;
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);
  const shuffle = <T>(arr: readonly T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return {
    next,
    float: (min = 0, max = 1) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    normal: (mean = 0, sd = 1) => {
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    shuffle,
    sample: (arr, n) => shuffle(arr).slice(0, n),
    weighted: (items) => {
      const total = items.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [item, w] of items) {
        r -= w;
        if (r <= 0) return item;
      }
      return items[items.length - 1][0];
    },
  };
}
