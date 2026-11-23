/** Pure state transitions. Every edit flows through these so derived views stay consistent. */
import type { Game, Player, Raw, SportState } from '@/lib/types';
import type { SportConfig } from '@/sports/types';

export const hasData = (r: Raw) => Object.values(r).some((v) => v !== 0 && Number.isFinite(v));

export function upsertPlayer(s: SportState, p: Player): SportState {
  const exists = s.players.some((x) => x.id === p.id);
  return { ...s, players: exists ? s.players.map((x) => (x.id === p.id ? p : x)) : [...s.players, p] };
}

/** Removed players keep their historical lines so past box scores still add up. */
export function removePlayer(s: SportState, id: string): SportState {
  return {
    ...s,
    players: s.players.map((p) => (p.id === id ? { ...p, removed: true } : p)),
    lineups: s.lineups.map((l) => ({ ...l, slots: l.slots.map((sl) => (sl.playerId === id ? { ...sl, playerId: null } : sl)) })),
  };
}

export function writeLines(cfg: SportConfig, s: SportState, gameId: string, lines: Record<string, Raw>): SportState {
  const players = s.players.map((p) => {
    const existing = p.gameStats.find((l) => l.gameId === gameId);
    const raw = lines[p.id];
    if (existing && raw && Object.keys(existing.s).length === Object.keys(raw).length && Object.entries(raw).every(([key, v]) => existing.s[key] === v)) return p;
    if (raw && hasData(raw)) {
      const normalized = cfg.normalize ? cfg.normalize(raw) : raw;
      if (existing && Object.keys(existing.s).length === Object.keys(normalized).length && Object.entries(normalized).every(([key, v]) => existing.s[key] === v)) return p;
      const line = { gameId, s: normalized };
      return { ...p, gameStats: existing ? p.gameStats.map((l) => l.gameId === gameId ? line : l) : [...p.gameStats, line] };
    }
    return existing ? { ...p, gameStats: p.gameStats.filter((l) => l.gameId !== gameId) } : p;
  });
  return { ...s, players };
}

export function addGame(cfg: SportConfig, s: SportState, game: Omit<Game, 'scoreFor'>, lines: Record<string, Raw>, upcomingId?: string): SportState {
  const normalized = Object.fromEntries(Object.entries(lines).filter(([, r]) => hasData(r)).map(([k, r]) => [k, cfg.normalize ? cfg.normalize(r) : r]));
  const teamStats = game.teamStats && (cfg.normalize ? cfg.normalize(game.teamStats) : game.teamStats);
  const g: Game = { ...game, teamStats, scoreFor: cfg.teamScore(teamStats ? [teamStats] : Object.values(normalized)) };
  const next = writeLines(cfg, { ...s, games: [...s.games, g].sort((a, b) => a.date.localeCompare(b.date)) }, g.id, normalized);
  return { ...next, upcoming: upcomingId ? next.upcoming.filter((u) => u.id !== upcomingId) : next.upcoming };
}

export function updateGame(cfg: SportConfig, s: SportState, gameId: string, lines: Record<string, Raw>, patch: Partial<Game>): SportState {
  const next = writeLines(cfg, s, gameId, lines);
  const ls = next.players.flatMap((p) => p.gameStats.filter((l) => l.gameId === gameId).map((l) => l.s));
  return { ...next, games: next.games.map((g) => {
    if (g.id !== gameId) return g;
    const merged = { ...g, ...patch };
    const teamStats = merged.teamStats && (cfg.normalize ? cfg.normalize(merged.teamStats) : merged.teamStats);
    return { ...merged, teamStats, scoreFor: cfg.teamScore(teamStats ? [teamStats] : ls) };
  }) };
}

export function deleteGame(s: SportState, gameId: string): SportState {
  return {
    ...s,
    games: s.games.filter((g) => g.id !== gameId),
    players: s.players.map((p) => ({ ...p, gameStats: p.gameStats.filter((l) => l.gameId !== gameId) })),
  };
}

export function boxFor(s: SportState, gameId: string): Record<string, Raw> {
  const out: Record<string, Raw> = {};
  for (const p of s.players) {
    const l = p.gameStats.find((x) => x.gameId === gameId);
    if (l) out[p.id] = { ...l.s };
  }
  return out;
}
