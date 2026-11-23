import { describe, expect, it } from 'vitest';
import { SPORT_LIST } from '@/sports';
import type { SlotDef } from '@/sports/types';
import { game, METRICS, player, roster, score } from '@/test/algorithms';
import { computeScores } from './analytics';
import { autoLineup, lineupScore, topIds } from './lineup';
import type { Player } from './types';

describe.each(SPORT_LIST)('$name lineups', (cfg) => {
  const shapes = Object.entries(cfg.formations ?? { default: cfg.slots });

  it.each(shapes)('fills %s only with eligible, unique players and a disjoint ranked bench', (_, slots) => {
    const players = roster(cfg);
    const scores = computeScores(cfg, players, [game()]);
    const before = structuredClone({ players, scores, slots });
    const result = autoLineup(cfg, slots, players, scores, true, 7);
    expect(result.slots.map((s) => s.slotId)).toEqual(slots.map((s) => s.id));
    expect(result.slots.every((s) => s.playerId !== null)).toBe(true);
    for (const s of result.slots) {
      const p = players.find((p) => p.id === s.playerId)!;
      expect(slots.find((def) => def.id === s.slotId)!.positions).toContain(p.position);
      expect(result.reasons[s.slotId]).toContain(`Score ${scores[p.id].score.toFixed(1)}`);
    }
    const starters = result.slots.map((s) => s.playerId!);
    expect(new Set([...starters, ...result.bench]).size).toBe(starters.length + result.bench.length);
    const expectedBench = players.filter((p) => !starters.includes(p.id))
      .sort((a, b) => scores[b.id].score - scores[a.id].score).slice(0, 7).map((p) => p.id);
    expect(result.bench).toEqual(expectedBench);
    expect(autoLineup(cfg, slots, players, scores, true, 7)).toEqual(result);
    expect({ players, scores, slots }).toEqual(before);
  });

  it.each(shapes)('leaves %s vacancies for empty, all-injured, removed, and depleted rosters', (_, slots) => {
    const full = roster(cfg);
    const variants: Player[][] = [
      [], full.map((p) => ({ ...p, status: 'Injured' })),
      full.map((p) => ({ ...p, removed: true })),
      full.map((p, i) => ({ ...p, status: i === 0 ? 'Questionable' : 'Injured' })),
    ];
    for (const players of variants) {
      const scores = computeScores(cfg, players, [game()]);
      const result = autoLineup(cfg, slots, players, scores, true, 7);
      const filled = result.slots.filter((s) => s.playerId);
      expect(filled.length).toBeLessThanOrEqual(1);
      expect(new Set(filled.map((s) => s.playerId)).size).toBe(filled.length);
      for (const s of result.slots) {
        if (!s.playerId) expect(result.reasons[s.slotId]).toBe('No eligible player available.');
        else {
          const p = players.find((p) => p.id === s.playerId)!;
          expect(p.status).toBe('Questionable');
          expect(slots.find((def) => def.id === s.slotId)!.positions).toContain(p.position);
        }
      }
      expect(result.bench.every((id) => players.find((p) => p.id === id)?.status !== 'Injured')).toBe(true);
      expect(Number.isFinite(lineupScore(result.slots, scores))).toBe(true);
    }
  });

  it('honors the injury toggle but never benches injured or removed players', () => {
    const players: Player[] = roster(cfg).map((p) => ({ ...p, status: 'Injured' }));
    players.push(player(cfg, { id: 'removed', removed: true }));
    const scores = computeScores(cfg, players, [game()]);
    const result = autoLineup(cfg, cfg.slots, players, scores, false, 7);
    expect(result.slots.every((s) => s.playerId && s.playerId !== 'removed')).toBe(true);
    expect(result.bench).toEqual([]);
    expect(lineupScore(result.slots, scores)).toBe(0);
  });

  it('enforces each balance rule by swapping an eligible specialist, not duplicating them', () => {
    for (const need of cfg.needs) {
      const pos = cfg.slots[0].positions[0];
      const slots: SlotDef[] = Array.from({ length: need.min }, (_, i) => ({
        id: `s${i}`, label: pos, positions: [pos], x: 0, y: 0,
      }));
      const starters = slots.map((_, i) => player(cfg, { id: `starter${i}`, position: pos }));
      const specialists = Array.from({ length: need.topN }, (_, i) =>
        player(cfg, { id: `specialist${i}`, position: pos }),
      );
      const players = [...starters, ...specialists];
      const higher = cfg.columns.find((c) => c.key === need.key)!.higher;
      const scores = Object.fromEntries(players.map((p, i) =>
        [p.id, score(p.id, i < starters.length ? 90 : 10, {
          [need.key]: i < starters.length ? (higher ? 0 : 10) : (higher ? 10 : 0),
        })],
      ));
      const result = autoLineup({ ...cfg, needs: [need] }, slots, players, scores, true, 7);
      expect(result.slots.every((s) => s.playerId?.startsWith('specialist'))).toBe(true);
      expect(new Set(result.slots.map((s) => s.playerId)).size).toBe(need.min);
      expect(result.notes.filter((n) => n.startsWith('Balance rule'))).toHaveLength(need.min);
      expect(result.bench.every((id) => !result.slots.some((s) => s.playerId === id))).toBe(true);
      const impossible = autoLineup({ ...cfg, needs: [need] }, slots, [], {}, true);
      expect(impossible.notes).toContain(`Could not satisfy: ${need.label} (no eligible player).`);
    }
  });

  it('sorts low-is-better leaders ascending and ignores missing observations', () => {
    const { low } = METRICS[cfg.id];
    const players = ['best', 'middle', 'worst', 'missing', 'no-games'].map((id) => player(cfg, { id }));
    const scores = {
      best: score('best', 50, { [low]: 1 }),
      middle: score('middle', 50, { [low]: 2 }),
      worst: score('worst', 50, { [low]: 3 }),
      missing: score('missing', 50, { [low]: NaN }),
      'no-games': { ...score('no-games', 50, { [low]: 0 }), gp: 0 },
    };
    expect([...topIds(cfg, low, 2, players, scores)]).toEqual(['best', 'middle']);
    expect([...topIds(cfg, 'unknown', 2, players, scores)]).toEqual([]);
  });
});

it('fills scarce positions before flexible slots and honors the four-point natural-position preference', () => {
  const cfg = { ...SPORT_LIST[0], needs: [] };
  const flexible: SlotDef = { id: 'flex', label: 'Flex', positions: ['A', 'B'], x: 0, y: 0 };
  const scarce: SlotDef = { id: 'scarce', label: 'A only', positions: ['A'], x: 0, y: 0 };
  const players = [player(cfg, { id: 'a', position: 'A' }), player(cfg, { id: 'b', position: 'B' })];
  const scores = { a: score('a', 90), b: score('b', 80) };
  expect(autoLineup(cfg, [flexible, scarce], players, scores, true).slots.map((s) => s.playerId)).toEqual(['b', 'a']);
  scores.a.score = 78;
  expect(autoLineup(cfg, [flexible], players, scores, true).slots[0].playerId).toBe('a');
  scores.b.score = 83;
  expect(autoLineup(cfg, [flexible], players, scores, true).slots[0].playerId).toBe('b');
});

it('counts empty slots and missing scores as zero when averaging a lineup', () => {
  const slots = [
    { slotId: 'a', label: 'A', position: 'A', playerId: 'a' },
    { slotId: 'b', label: 'B', position: 'B', playerId: null },
    { slotId: 'c', label: 'C', position: 'C', playerId: 'unknown' },
  ];
  expect(lineupScore(slots, { a: score('a', 80) })).toBe(26.7);
  expect(lineupScore([], {})).toBe(0);
});
