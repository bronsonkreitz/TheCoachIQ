import type { Game, Player, Raw, SportId, SportState } from '@/lib/types';
import type { PlayerScore } from '@/lib/analytics';
import type { SportConfig } from '@/sports/types';

/** Hand-built inputs: no generated seasons, current dates, or random ratings. */
export function game(id = 'g1', date = '2026-01-01'): Game {
  return {
    id, date, teamId: 'test-team', opponent: 'Test opponent', homeAway: 'Home',
    scoreFor: 10, scoreAgainst: 5, extra: {},
  };
}

export function raw(cfg: SportConfig, overrides: Raw = {}): Raw {
  return { ...Object.fromEntries(cfg.rawKeys.map(({ key }) => [key, 10])), ...overrides };
}

export function player(cfg: SportConfig, overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', teamId: cfg.team.id, name: 'Test Player', number: 1,
    position: cfg.positions[0], status: 'Active', age: 18, height: '6 ft',
    weight: 180, year: cfg.years[0], notes: '', skill: 0.5,
    gameStats: [{ gameId: 'g1', s: raw(cfg) }],
    ...overrides,
  };
}

export function roster(cfg: SportConfig): Player[] {
  return cfg.rosterPlan.flatMap(({ pos, count }) =>
    Array.from({ length: count }, (_, i) =>
      player(cfg, { id: `${pos}-${i}`, name: `${pos} ${i}`, position: pos }),
    ),
  );
}

export function state(cfg: SportConfig, players: Player[] = [], games: Game[] = []): SportState {
  return {
    version: 1, team: cfg.team, players, games, upcoming: [],
    lineups: [], plans: [], tools: {},
  };
}

export function score(id: string, value: number, stats: Raw = {}): PlayerScore {
  return {
    id, score: value, seasonScore: value, formScore: value, avail: 1, gp: 1,
    stats, formStats: stats, pcts: {}, contributions: [],
  };
}

// Real columns and positions, with simple counting inputs for hand-calculated ranks.
export const METRICS: Record<SportId, { position: string; high: string; low: string; lowRaw: string }> = {
  baseball: { position: 'SS', high: 'hr', low: 'kpct', lowRaw: 'k' },
  soccer: { position: 'CB', high: 'tkl', low: 'yc', lowRaw: 'yc' },
  football: { position: 'QB', high: 'pyd', low: 'pint', lowRaw: 'pint' },
  basketball: { position: 'PG', high: 'pts', low: 'tov', lowRaw: 'tov' },
  hockey: { position: 'D', high: 'blk', low: 'pim', lowRaw: 'pim' },
};
