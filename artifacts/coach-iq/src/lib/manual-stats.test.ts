import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SPORTS } from '@/sports';
import { buildSport } from '@/data/generate';
import { addGame, boxFor, updateGame } from '@/store/actions';
import { gameTeamStats, playerStats, sumRaw, teamAgg } from './analytics';
import { statEntryError } from './manual-stats';
import type { Raw, SportId, SportState } from './types';

const entries: Record<SportId, Raw> = {
  basketball: { fgm: 3, fga: 6, tpm: 1, tpa: 2, ftm: 2, fta: 3, reb: 8 },
  baseball: { pa: 6, ab: 5, h: 3, r: 3, hr: 1, d: 1, bb: 1, rbi: 2 },
  soccer: { g: 2, a: 1, sh: 5, sot: 3, pa: 50, pc: 40 },
  football: { pcmp: 10, patt: 20, pyd: 150, fgm: 1, fga: 2 },
  hockey: { g: 2, sh: 12, a: 1, sa: 20, ga: 1, toi: 18 },
};

for (const cfg of Object.values(SPORTS)) {
  test(`${cfg.name}: manual team totals update aggregate stats without changing players`, () => {
    const original = buildSport(cfg);
    const game = original.games[0];
    const beforePlayers = JSON.stringify(original.players);
    const raw = entries[cfg.id];
    const manual = cfg.normalize ? cfg.normalize(raw) : raw;
    const before = gameTeamStats(original, game);
    const updated = updateGame(cfg, original, game.id, boxFor(original, game.id), { teamStats: raw });
    const changed = updated.games.find((g) => g.id === game.id)!;
    assert.deepEqual(gameTeamStats(updated, changed), manual);
    assert.equal(changed.scoreFor, cfg.teamScore([manual]));
    assert.equal(JSON.stringify(updated.players), beforePlayers);
    const oldAgg = teamAgg(original);
    const newAgg = teamAgg(updated);
    for (const k of new Set([...Object.keys(before), ...Object.keys(manual)])) {
      assert.ok(Math.abs((newAgg.totals[k] ?? 0) - ((oldAgg.totals[k] ?? 0) - (before[k] ?? 0) + (manual[k] ?? 0))) < 1e-7);
    }
    // Persisted entries are ordinary JSON, and continue to drive team views after reload.
    const restored: SportState = JSON.parse(JSON.stringify(updated));
    assert.deepEqual(gameTeamStats(restored, restored.games.find((g) => g.id === game.id)!), manual);
  });

  test(`${cfg.name}: clearing a manual team override restores the player-derived total`, () => {
    const original = buildSport(cfg);
    const game = original.games[0];
    const lines = boxFor(original, game.id);
    const manual = updateGame(cfg, original, game.id, lines, { teamStats: entries[cfg.id] });
    const restored = updateGame(cfg, manual, game.id, lines, { teamStats: undefined });
    const current = restored.games.find((g) => g.id === game.id)!;
    assert.deepEqual(gameTeamStats(restored, current), sumRaw(Object.values(lines)));
    assert.equal(current.scoreFor, game.scoreFor);
    assert.deepEqual(teamAgg(restored).totals, teamAgg(original).totals);
  });

  test(`${cfg.name}: editing one player preserves teammates and manual team entries`, () => {
    const original = buildSport(cfg);
    const game = original.games[0];
    const player = original.players[0];
    const raw = cfg.normalize ? cfg.normalize(entries[cfg.id]) : entries[cfg.id];
    const lines = { ...boxFor(original, game.id), [player.id]: raw };
    const manual = updateGame(cfg, original, game.id, boxFor(original, game.id), { teamStats: raw });
    const updated = updateGame(cfg, manual, game.id, lines, {});
    assert.deepEqual(updated.players.filter((p) => p.id !== player.id), original.players.filter((p) => p.id !== player.id));
    assert.deepEqual(updated.players.find((p) => p.id === player.id)!.gameStats.find((l) => l.gameId === game.id)!.s, raw);
    assert.deepEqual(updated.games.find((g) => g.id === game.id)!.teamStats, raw);
    assert.equal(playerStats(cfg, updated.players[0]).gp, updated.players[0].gameStats.length);
  });

  test(`${cfg.name}: a team-only new result does not create or erase player lines`, () => {
    const original = buildSport(cfg);
    const next = addGame(cfg, original, {
      id: 'manual-test-game', teamId: original.team.id, opponent: 'Manual Test Owls',
      date: '2026-11-23', homeAway: 'Home', scoreAgainst: 1, extra: {}, teamStats: entries[cfg.id],
    }, {});
    assert.equal(next.games.length, original.games.length + 1);
    assert.deepEqual(next.players, original.players);
    assert.ok(next.games.find((g) => g.id === 'manual-test-game')!.scoreFor > 1);
    assert.deepEqual(teamAgg(next, new Set(['manual-test-game'])).totals, cfg.normalize ? cfg.normalize(entries[cfg.id]) : entries[cfg.id]);
  });

  test(`${cfg.name}: manual entry rejects invalid counts and impossible ratios`, () => {
    assert.equal(statEntryError(cfg, entries[cfg.id]), null);
    const first = cfg.rawKeys.find((k) => !k.calc)!;
    assert.ok(statEntryError(cfg, { [first.key]: Infinity }));
    assert.ok(statEntryError(cfg, { [first.key]: -5 }));
  });
}

test('basketball points and percentages are derived from shooting counts', () => {
  const cfg = SPORTS.basketball;
  assert.equal(cfg.normalize!(entries.basketball).pts, 9);
  assert.match(statEntryError(cfg, { fgm: 5, fga: 3 })!, /FGM cannot exceed FGA/);
  assert.equal(statEntryError(cfg, { pmn: -7 }), null);
});
