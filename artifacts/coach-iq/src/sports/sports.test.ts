import { describe, expect, it } from 'vitest';
import { SPORTS, SPORT_LIST } from './index';
import { game, player, raw } from '@/test/algorithms';
import { computeScores } from '@/lib/analytics';
import type { Raw, SportId } from '@/lib/types';

const DERIVED: Record<SportId, { input: Raw; gp: number; expected: Raw }> = {
  baseball: {
    input: { pa: 12, ab: 10, h: 4, d: 1, t: 1, hr: 1, bb: 2, k: 3, ch: 20, e: 1,
      outs: 18, er: 2, ha: 4, bba: 2, kp: 6, pc: 90 },
    gp: 2, expected: { avg: 0.4, obp: 0.5, slg: 1, ops: 1.5, kpct: 0.25,
      bbpct: 1 / 6, fld: 0.95, era: 3, whip: 1, k9: 9, bb9: 3, ip: 18, pcg: 45 },
  },
  soccer: {
    input: { g: 2, a: 1, pa: 50, pc: 40, sv: 8, ga: 2, min: 180 },
    gp: 2, expected: { g: 2, a: 1, pcp: 0.8, svp: 0.8, ga90: 1 },
  },
  football: {
    input: { patt: 20, pcmp: 12, pyd: 180, pint: 1, car: 10, ryd: 45,
      fgm: 3, fga: 4, pntyd: 120, pnt: 3 },
    gp: 2, expected: { pyd: 180, pint: 1, cmp: 0.6, ypc: 4.5, fgp: 0.75, pavg: 40 },
  },
  basketball: {
    input: { pts: 25, reb: 8, fgm: 9, fga: 20, tpm: 3, tpa: 10, ftm: 4, fta: 5, pmn: -3 },
    gp: 2, expected: { pts: 25, reb: 8, fg: 0.45, tp: 0.3, ft: 0.8, pm: -3 },
  },
  hockey: {
    input: { g: 3, a: 4, sh: 20, pmn: -2, toi: 36, fow: 12, fol: 8, sa: 50, ga: 4, gtoi: 120 },
    gp: 2, expected: { pts: 7, pm: -2, shp: 0.15, toi: 18, fo: 0.6, svp: 0.92, gaa: 2 },
  },
};

const STARTER_COUNTS: Record<SportId, number> = {
  baseball: 10, soccer: 11, football: 22, basketball: 5, hockey: 6,
};

it('registers exactly the five supported sports', () => {
  expect(SPORT_LIST.map((cfg) => cfg.id).sort()).toEqual(['baseball', 'basketball', 'football', 'hockey', 'soccer']);
  for (const cfg of SPORT_LIST) expect(SPORTS[cfg.id]).toBe(cfg);
});

describe.each(SPORT_LIST)('$name configuration', (cfg) => {
  it('derives known counting stats and rates from hand-calculated inputs', () => {
    const { input, gp, expected } = DERIVED[cfg.id];
    const before = { ...input };
    const actual = cfg.derive(input, gp);
    for (const [key, value] of Object.entries(expected)) expect(actual[key], key).toBeCloseTo(value, 10);
    expect(input).toEqual(before);
    // Missing denominators must not become infinity or fabricate an observed rate.
    expect(Object.values(cfg.derive({}, 0)).some((v) => v === Infinity || v === -Infinity)).toBe(false);
  });

  it('connects every role weight and balance rule to a valid scoring column', () => {
    const columns = cfg.columns.map((c) => c.key);
    expect(new Set(columns).size).toBe(columns.length);
    const derived = cfg.derive(raw(cfg), 1);
    for (const col of cfg.columns) expect(col.key in derived, col.key).toBe(true);
    for (const pos of cfg.positions) {
      expect(cfg.pool(pos)).toBeTruthy();
      const weights = cfg.weights(pos);
      expect(Object.keys(weights).length).toBeGreaterThan(0);
      for (const [key, weight] of Object.entries(weights)) {
        expect(columns).toContain(key);
        expect(weight).toBeGreaterThan(0);
        expect(Number.isFinite(weight)).toBe(true);
      }
      const p = player(cfg, { position: pos });
      expect(computeScores(cfg, [p], [game()])[p.id].score).toBe(50);
    }
    for (const need of cfg.needs) {
      expect(columns).toContain(need.key);
      expect(need.min).toBeGreaterThan(0);
      expect(need.min).toBeLessThanOrEqual(need.topN);
    }
  });

  it('defines valid, unique formation slots and drills for every benchmark', () => {
    for (const slots of Object.values(cfg.formations ?? { default: cfg.slots })) {
      expect(slots).toHaveLength(STARTER_COUNTS[cfg.id]);
      expect(new Set(slots.map((s) => s.id)).size).toBe(slots.length);
      for (const slot of slots) {
        expect(slot.positions.length).toBeGreaterThan(0);
        expect(slot.positions.every((p) => cfg.positions.includes(p))).toBe(true);
      }
    }
    // Critical specialist roles must not be silently opened to unrelated positions.
    const specialist = ({ baseball: 'P', soccer: 'GK', football: 'QB', hockey: 'G', basketball: 'PG' } as const)[cfg.id];
    expect(cfg.slots.find((s) => s.positions[0] === specialist)!.positions).toEqual([specialist]);
    expect(new Set(cfg.drills.map((d) => d.id)).size).toBe(cfg.drills.length);
    expect(new Set(cfg.benchmarks.map((b) => b.key)).size).toBe(cfg.benchmarks.length);
    for (const phase of ['warmup', 'scrimmage', 'cooldown']) {
      expect(cfg.drills.some((d) => d.phase === phase)).toBe(true);
    }
    for (const bench of cfg.benchmarks) {
      expect(bench.league).toBeGreaterThan(0);
      expect(cfg.drills.some((d) => d.phase === 'skill' && d.focusTags.some((tag) => bench.tags.includes(tag)))).toBe(true);
    }
  });
});
