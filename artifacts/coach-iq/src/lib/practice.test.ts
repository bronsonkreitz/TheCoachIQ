import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SPORT_LIST } from '@/sports';
import type { SportId } from './types';
import { game, player, raw, state } from '@/test/algorithms';
import { benchmarkRows, teamAgg } from './analytics';
import { generatePlan } from './practice';

const ids = vi.hoisted(() => ({ next: 0 }));
vi.mock('./rng', async (importOriginal) => ({
  ...await importOriginal<typeof import('./rng')>(),
  uid: (prefix: string) => `${prefix}-${++ids.next}`,
}));
beforeEach(() => { ids.next = 0; });

// Independent expected weakest categories for one hand-entered team game.
const WEAKEST: Record<SportId, string> = {
  baseball: 'kpct', soccer: 'ga', football: 'ppg', basketball: 'reb', hockey: 'ga',
};
const LENGTHS = [45, 60, 75, 90, 105, 120, 135, 150];
const INTENSITIES = ['Low', 'Medium', 'High'] as const;

describe.each(SPORT_LIST)('$name practice plans', (cfg) => {
  const agg = () => teamAgg(state(cfg, [], [{ ...game(), teamStats: raw(cfg) }]));

  it('targets the weakest real team benchmarks with matching drills and largest skill allocation', () => {
    const rows = benchmarkRows(cfg, agg());
    expect(rows[0].bench.key).toBe(WEAKEST[cfg.id]);
    expect(rows.map((r) => r.index)).toEqual(rows.map((r) => r.index).sort((a, b) => a - b));
    const focus = rows.slice(0, 3);
    const before = structuredClone(focus.map(({ bench, ...rest }) => ({ key: bench.key, ...rest })));
    const blocks = generatePlan(cfg, { lengthMin: 90, intensity: 'Medium', focus });
    const skills = blocks.filter((b) => b.phase === 'skill');
    expect(skills[0].focus).toBe(rows[0].bench.label);
    const allocated = focus.map((row) => skills.filter((b) => b.focus === row.bench.label)
      .reduce((sum, b) => sum + b.minutes, 0));
    expect(allocated).toEqual([30, 15, 10]); // 55 skill minutes, rounded 50/30/20 split
    for (const block of skills) {
      const drill = cfg.drills.find((d) => d.id === block.drillId)!;
      const row = focus.find((r) => r.bench.label === block.focus)!;
      expect(drill.focusTags.some((tag) => row.bench.tags.includes(tag))).toBe(true);
    }
    expect(focus.map(({ bench, ...rest }) => ({ key: bench.key, ...rest }))).toEqual(before);
    // Output identities are deterministic in the test but still unique within a plan.
    expect(new Set(blocks.map((b) => b.uid)).size).toBe(blocks.length);
    ids.next = 0;
    expect(generatePlan(cfg, { lengthMin: 90, intensity: 'Medium', focus })).toEqual(blocks);
  });

  describe.each(INTENSITIES)('%s intensity', (intensity) => {
    it.each(LENGTHS)('keeps exactly %i minutes for zero through three focus areas', (lengthMin) => {
      const rows = benchmarkRows(cfg, agg());
      for (const count of [0, 1, 2, 3]) {
        const blocks = generatePlan(cfg, { lengthMin, intensity, focus: rows.slice(0, count) });
        expect(blocks.reduce((sum, b) => sum + b.minutes, 0)).toBe(lengthMin);
        expect(blocks.every((b) => Number.isInteger(b.minutes) && b.minutes > 0)).toBe(true);
        expect(blocks.every((b) => b.minutes % 5 === 0 && b.done === false)).toBe(true);
        expect(blocks[0].phase).toBe('warmup');
        expect(blocks.at(-1)!.phase).toBe('cooldown');
        expect(blocks.filter((b) => b.phase === 'scrimmage')).toHaveLength(1);
        expect(blocks.filter((b) => b.phase === 'warmup')).toHaveLength(1);
        expect(blocks.filter((b) => b.phase === 'cooldown')).toHaveLength(1);
        expect(blocks.at(-2)!.phase).toBe('scrimmage');
        expect(blocks.every((b) => cfg.drills.some((d) => d.id === b.drillId && d.phase === b.phase))).toBe(true);
        expect(new Set(blocks.map((b) => b.uid)).size).toBe(blocks.length);
        if (!count) expect(blocks.map((b) => b.phase)).toEqual(['warmup', 'scrimmage', 'cooldown']);
        else expect(new Set(blocks.filter((b) => b.phase === 'skill').map((b) => b.focus)))
          .toEqual(new Set(rows.slice(0, count).map((r) => r.bench.label)));
      }
    });
  });

  it('reserves positive time for all three focuses in a short low-intensity session', () => {
    const focus = benchmarkRows(cfg, agg()).slice(0, 3);
    const blocks = generatePlan(cfg, { lengthMin: 45, intensity: 'Low', focus });
    expect(blocks.filter((b) => b.phase === 'skill').map((b) => b.minutes)).toEqual([15, 5, 5]);
    expect(blocks.reduce((sum, b) => sum + b.minutes, 0)).toBe(45);
  });

  it('increases scrimmage time with intensity while preserving the total duration', () => {
    const focus = benchmarkRows(cfg, agg()).slice(0, 3);
    expect(INTENSITIES.map((intensity) => {
      const blocks = generatePlan(cfg, { lengthMin: 90, intensity, focus });
      expect(blocks.reduce((sum, b) => sum + b.minutes, 0)).toBe(90);
      return blocks.find((b) => b.phase === 'scrimmage')!.minutes;
    })).toEqual([10, 20, 25]);
  });

  it('can train every benchmark, not just the default weakest three', () => {
    for (const focus of benchmarkRows(cfg, agg())) {
      const blocks = generatePlan(cfg, { lengthMin: 90, intensity: 'Medium', focus: [focus] });
      const skills = blocks.filter((b) => b.phase === 'skill');
      expect(skills.length).toBeGreaterThan(0);
      expect(skills.every((b) => cfg.drills.find((d) => d.id === b.drillId)!.focusTags
        .some((tag) => focus.bench.tags.includes(tag)))).toBe(true);
      expect(blocks.reduce((sum, b) => sum + b.minutes, 0)).toBe(90);
    }
  });

  it('produces a valid full-length plan with empty or entirely injured rosters', () => {
    for (const players of [[], [player(cfg, { status: 'Injured', gameStats: [] })]]) {
      const focus = benchmarkRows(cfg, teamAgg(state(cfg, players))).slice(0, 3);
      const blocks = generatePlan(cfg, { lengthMin: 45, intensity: 'High', focus });
      expect(blocks.reduce((sum, b) => sum + b.minutes, 0)).toBe(45);
      expect(blocks.every((b) => Number.isFinite(b.minutes) && b.minutes > 0)).toBe(true);
    }
  });
});

it('ranks benchmark gaps in the right direction, clamps extremes, and handles undefined rates', () => {
  const cfg = SPORT_LIST[0];
  const base = cfg.benchmarks[0];
  const values = [
    { key: 'higher-worse', higher: true, value: () => 9 },
    { key: 'lower-worse', higher: false, value: () => 11 },
    { key: 'average', higher: true, value: () => 10 },
    { key: 'higher-better', higher: true, value: () => 11 },
    { key: 'lower-better', higher: false, value: () => 9 },
    { key: 'bottom', higher: true, value: () => 0 },
    { key: 'top', higher: true, value: () => 100 },
    { key: 'missing', higher: true, value: () => NaN },
  ];
  const rows = benchmarkRows({
    ...cfg, benchmarks: values.map((v) => ({ ...base, league: 10, ...v })),
  }, teamAgg(state(cfg)));
  expect(Object.fromEntries(rows.map((r) => [r.bench.key, r.index]))).toEqual({
    'higher-worse': 25, 'lower-worse': 25, average: 50,
    'higher-better': 75, 'lower-better': 75, bottom: 1, top: 99, missing: 50,
  });
});
