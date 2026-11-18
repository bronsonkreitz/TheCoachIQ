/** Deterministic helpers so the fictional season is identical on every first load. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const ri = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function binom(r: Rng, n: number, p: number): number {
  let k = 0;
  const pp = clamp(p, 0, 1);
  for (let i = 0; i < n; i++) if (r() < pp) k++;
  return k;
}

export function pois(r: Rng, lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > L && k < 200);
  return k - 1;
}

export function pickW<T>(r: Rng, items: T[], w: (t: T) => number): T {
  const weights = items.map((i) => Math.max(0.0001, w(i)));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
