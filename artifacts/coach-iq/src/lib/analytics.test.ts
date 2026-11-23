import { describe, expect, it } from 'vitest';
import { SPORT_LIST } from '@/sports';
import { game, METRICS, player, raw, state } from '@/test/algorithms';
import { benchmarkRows, colVal, computeScores, lastNIds, playerStats, teamAgg } from './analytics';

describe.each(SPORT_LIST)('$name scoring', (cfg) => {
  const metric = METRICS[cfg.id];

  it('ranks higher and lower-is-better columns, ties, and missing data exactly', () => {
    const players = [1, 2, 2, 3].map((v, i) => player(cfg, {
      id: `p${i}`, position: metric.position,
      gameStats: [{ gameId: 'g1', s: raw(cfg, { [metric.high]: v, [metric.lowRaw]: v }) }],
    }));
    players.push(player(cfg, { id: 'new', position: metric.position, gameStats: [] }));
    players.push(player(cfg, { id: 'removed', position: metric.position, removed: true }));
    const before = structuredClone(players);
    const scores = computeScores(cfg, players, [game()]);
    expect(players).toEqual(before);
    expect(scores.removed).toBeUndefined();
    expect(players.slice(0, 4).map((p) => scores[p.id].pcts[metric.high])).toEqual([0, 50, 50, 100]);
    expect(players.slice(0, 4).map((p) => scores[p.id].pcts[metric.low])).toEqual([100, 50, 50, 0]);
    expect(Number.isNaN(scores.new.pcts[metric.high])).toBe(true);
    expect(scores.new.score).toBe(40);
    expect(scores.new.contributions.every((c) => c.pct === 40 && c.formPct === 40)).toBe(true);
  });

  it('uses 60% season and 40% last-five form in date order, not input order', () => {
    const games = Array.from({ length: 7 }, (_, i) => game(`g${i}`, `2026-01-0${i + 1}`));
    const players = [player(cfg, {
      id: 'cooling', position: metric.position,
      gameStats: games.map((g, i) => ({
        gameId: g.id, s: raw(cfg, { [metric.high]: i < 2 ? 100 : 0 }),
      })).reverse(),
    }), player(cfg, {
      id: 'steady', position: metric.position,
      gameStats: games.map((g) => ({ gameId: g.id, s: raw(cfg, { [metric.high]: 10 }) })),
    })];
    // Isolate one real counting column to give the blend an independent numeric oracle.
    const oneMetric = { ...cfg, weights: () => ({ [metric.high]: 1 }) };
    const scores = computeScores(oneMetric, players, [...games].reverse());
    expect(scores.cooling.stats[metric.high]).toBe(200);
    expect(scores.cooling.formStats[metric.high]).toBe(0);
    expect(scores.cooling).toMatchObject({ seasonScore: 100, formScore: 0, score: 60, gp: 7 });
    expect(scores.steady).toMatchObject({ seasonScore: 0, formScore: 100, score: 40 });
    expect([...lastNIds([...games].reverse(), 5)]).toEqual(['g2', 'g3', 'g4', 'g5', 'g6']);
  });

  it('rounds non-tied percentiles consistently in both directions', () => {
    const players = [1, 2, 3, 4].map((v) => player(cfg, {
      id: `p${v}`, position: metric.position,
      gameStats: [{ gameId: 'g1', s: raw(cfg, { [metric.high]: v, [metric.lowRaw]: v }) }],
    }));
    const scores = computeScores(cfg, players, [game()]);
    expect(players.map((p) => scores[p.id].pcts[metric.high])).toEqual([0, 33, 67, 100]);
    expect(players.map((p) => scores[p.id].pcts[metric.low])).toEqual([100, 67, 33, 0]);
  });

  it('normalizes counting stats per appearance, not by team games or raw totals', () => {
    const p = player(cfg, { position: metric.position, gameStats: [
      { gameId: 'g1', s: raw(cfg, { [metric.high]: 5 }) },
      { gameId: 'g2', s: raw(cfg, { [metric.high]: 5 }) },
    ] });
    const other = player(cfg, { id: 'other', position: metric.position,
      gameStats: [{ gameId: 'g1', s: raw(cfg, { [metric.high]: 6 }) }],
    });
    const scores = computeScores(cfg, [p, other], [game(), game('g2'), game('g3')]);
    expect(scores[p.id].pcts[metric.high]).toBe(0); // 10 / 2 < 6 / 1
    expect(scores.other.pcts[metric.high]).toBe(100);
    const filtered = playerStats(cfg, p, new Set(['g2']));
    expect(filtered.gp).toBe(1);
    expect(filtered.stats[metric.high]).toBe(5);
    const col = cfg.columns.find((c) => c.key === metric.high)!;
    expect(colVal(col, scores[p.id].stats, 2, 'tot')).toBe(10);
    expect(colVal(col, scores[p.id].stats, 2, 'pg')).toBe(5);
    expect(Number.isNaN(colVal(col, scores[p.id].stats, 0, 'pg'))).toBe(true);
  });

  it('applies position weights and Active x1, Questionable x0.8, Injured x0', () => {
    const players = (['Active', 'Questionable', 'Injured'] as const).map((status) =>
      player(cfg, { id: status, status, position: metric.position }),
    );
    const scores = computeScores(cfg, players, [game()]);
    // All three have identical valid stats, so every weighted percentile is 50.
    expect(scores.Active.score).toBe(50);
    expect(scores.Questionable.score).toBe(40);
    expect(scores.Injured.score).toBe(0);
    expect(players.map((p) => scores[p.id].avail)).toEqual([1, 0.8, 0]);
    for (const p of players) {
      const sc = scores[p.id];
      expect(Object.fromEntries(sc.contributions.map((c) => [c.key, c.weight]))).toEqual(cfg.weights(p.position));
      expect(sc.seasonScore).toBe(50);
      expect(sc.formScore).toBe(50);
    }
    // Non-tied values verify that weights affect the score, not just its explanation.
    const varied = [...players, player(cfg, { id: 'varied', position: metric.position,
      gameStats: [{ gameId: 'g1', s: raw(cfg, { [metric.high]: 20 }) }],
    })];
    const mixed = computeScores(cfg, varied, [game()]).varied;
    const weights = cfg.weights(metric.position);
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    // More HR also increases SLG (and OPS, which has no batting weight).
    const improved = cfg.id === 'baseball' ? ['hr', 'slg'] : [metric.high];
    const expected = Object.entries(weights).reduce((sum, [key, w]) =>
      sum + w * (improved.includes(key) ? 100 : 50), 0) / totalWeight;
    expect(mixed.seasonScore).toBeCloseTo(expected);
    expect(mixed.score).toBe(Math.round(expected * 10) / 10);
  });

  it('gives a single observed player neutral percentiles and handles an empty roster', () => {
    const p = player(cfg, { position: metric.position });
    const sc = computeScores(cfg, [p], [game()])[p.id];
    expect(Object.values(sc.pcts).every((v) => v === 50)).toBe(true);
    expect(sc.score).toBe(50);
    expect(computeScores(cfg, [], [])).toEqual({});
    expect(benchmarkRows(cfg, teamAgg(state(cfg))).every((r) =>
      Number.isFinite(r.index) && r.index >= 1 && r.index <= 99,
    )).toBe(true);
  });

  it('keeps role-specific comparison pools separate', () => {
    const first = cfg.positions[0];
    const other = cfg.positions.find((pos) => cfg.pool(pos) !== cfg.pool(first));
    if (!other) {
      // Basketball intentionally compares all five positions in one pool.
      expect(new Set(cfg.positions.map(cfg.pool))).toEqual(new Set(['ALL']));
      return;
    }
    const a = player(cfg, { id: 'a', position: first });
    const b = player(cfg, { id: 'b', position: other, gameStats: [{ gameId: 'g1', s: raw(cfg,
      Object.fromEntries(cfg.rawKeys.map(({ key }) => [key, 100])),
    ) }] });
    const scores = computeScores(cfg, [a, b], [game()]);
    expect(scores.a.seasonScore).toBe(50);
    expect(scores.b.seasonScore).toBe(50);
  });
});
