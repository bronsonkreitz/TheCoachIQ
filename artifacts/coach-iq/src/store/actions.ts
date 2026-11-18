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
    const others = p.gameStats.filter((l) => l.gameId !== gameId);
    const raw = lines[p.id];
    if (raw && hasData(raw)) return { ...p, gameStats: [...others, { gameId, s: cfg.normalize ? cfg.normalize(raw) : raw }] };
    return { ...p, gameStats: others };
  });
  return { ...s, players };
}

export function addGame(cfg: SportConfig, s: SportState, game: Omit<Game, 'scoreFor'>, lines: Record<string, Raw>, upcomingId?: string): SportState {
  const normalized = Object.fromEntries(Object.entries(lines).filter(([, r]) => hasData(r)).map(([k, r]) => [k, cfg.normalize ? cfg.normalize(r) : r]));
  const g: Game = { ...game, scoreFor: cfg.teamScore(Object.values(normalized)) };
  const next = writeLines(cfg, { ...s, games: [...s.games, g].sort((a, b) => a.date.localeCompare(b.date)) }, g.id, normalized);
  return { ...next, upcoming: upcomingId ? next.upcoming.filter((u) => u.id !== upcomingId) : next.upcoming };
}

export function updateGame(cfg: SportConfig, s: SportState, gameId: string, lines: Record<string, Raw>, patch: Partial<Game>): SportState {
  const next = writeLines(cfg, s, gameId, lines);
  const ls = next.players.flatMap((p) => p.gameStats.filter((l) => l.gameId === gameId).map((l) => l.s));
  return { ...next, games: next.games.map((g) => (g.id === gameId ? { ...g, ...patch, scoreFor: cfg.teamScore(ls) } : g)) };
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
