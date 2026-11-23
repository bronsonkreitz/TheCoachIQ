/**
 * The CoachIQ scoring engine (PRD section 11).
 * score = weighted percentile blend (position weights) x availability, with
 * season stats weighted 60% and the last 5 games weighted 40%.
 */
import type { Game, Player, Raw, SportState, Status } from './types';
import type { Bench, SportConfig, StatCol, TeamAgg } from '@/sports/types';

export const AVAILABILITY: Record<Status, number> = { Active: 1, Questionable: 0.8, Injured: 0 };
export const SEASON_W = 0.6;
export const FORM_W = 0.4;

export function sumRaw(raws: Raw[]): Raw {
  const out: Raw = {};
  for (const r of raws) for (const k in r) out[k] = (out[k] || 0) + (r[k] || 0);
  return out;
}

export function gameOrder(games: Game[]) {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date));
  return new Map(sorted.map((g, i) => [g.id, i]));
}

export function linesFor(p: Player, filter?: Set<string>, order?: Map<string, number>) {
  let ls = filter ? p.gameStats.filter((l) => filter.has(l.gameId)) : p.gameStats;
  if (order) ls = [...ls].sort((a, b) => (order.get(a.gameId) ?? 0) - (order.get(b.gameId) ?? 0));
  return ls;
}

export interface PlayerStats {
  gp: number;
  totals: Raw;
  stats: Record<string, number>;
}

export function playerStats(cfg: SportConfig, p: Player, filter?: Set<string>): PlayerStats {
  const ls = linesFor(p, filter);
  const totals = sumRaw(ls.map((l) => l.s));
  return { gp: ls.length, totals, stats: cfg.derive(totals, ls.length) };
}

/** Value of a column in a given display mode. */
export function colVal(col: StatCol, stats: Record<string, number>, gp: number, mode: 'pg' | 'tot') {
  const v = stats[col.key];
  if (!Number.isFinite(v)) return NaN;
  if (col.count && mode === 'pg') return gp ? v / gp : NaN;
  return v;
}

export function colLabel(col: StatCol, mode: 'pg' | 'tot') {
  return col.count && mode === 'pg' && col.fmt !== 'ip' ? `${col.label}/G` : col.label;
}

export function colFmt(col: StatCol, mode: 'pg' | 'tot') {
  if (col.count && mode === 'pg' && col.fmt === 'int') return 'd1' as const;
  return col.fmt;
}

function percentiles(values: { id: string; v: number }[], higher: boolean) {
  const out = new Map<string, number>();
  const fin = values.filter((x) => Number.isFinite(x.v));
  for (const x of fin) {
    if (fin.length === 1) {
      out.set(x.id, 50);
      continue;
    }
    let below = 0;
    let eq = 0;
    for (const y of fin) {
      if (y.v < x.v) below++;
      else if (y.v === x.v) eq++;
    }
    let pct = ((below + 0.5 * (eq - 1)) / (fin.length - 1)) * 100;
    if (!higher) pct = 100 - pct;
    out.set(x.id, Math.round(pct));
  }
  return out;
}

export interface Contribution {
  key: string;
  label: string;
  weight: number;
  pct: number;
  formPct: number;
}

export interface PlayerScore {
  id: string;
  score: number;
  seasonScore: number;
  formScore: number;
  avail: number;
  gp: number;
  stats: Record<string, number>;
  formStats: Record<string, number>;
  pcts: Record<string, number>;
  contributions: Contribution[];
}

const NEUTRAL = 40;

export function computeScores(cfg: SportConfig, players: Player[], games: Game[]): Record<string, PlayerScore> {
  const order = gameOrder(games);
  const active = players.filter((p) => !p.removed);
  const season = new Map(active.map((p) => [p.id, playerStats(cfg, p)]));
  const form = new Map(
    active.map((p) => {
      const ls = linesFor(p, undefined, order).slice(-5);
      const t = sumRaw(ls.map((l) => l.s));
      return [p.id, { gp: ls.length, stats: cfg.derive(t, ls.length) }];
    }),
  );
  const pools = new Map<string, Player[]>();
  for (const p of active) {
    const k = cfg.pool(p.position);
    pools.set(k, [...(pools.get(k) ?? []), p]);
  }
  const sPct = new Map<string, Record<string, number>>();
  const fPct = new Map<string, Record<string, number>>();
  for (const members of pools.values()) {
    for (const col of cfg.columns) {
      const sv = members.map((p) => {
        const s = season.get(p.id)!;
        return { id: p.id, v: s.gp ? colVal(col, s.stats, s.gp, 'pg') : NaN };
      });
      const fv = members.map((p) => {
        const f = form.get(p.id)!;
        return { id: p.id, v: f.gp ? colVal(col, f.stats, f.gp, 'pg') : NaN };
      });
      const sp = percentiles(sv, col.higher);
      const fp = percentiles(fv, col.higher);
      for (const m of members) {
        sPct.set(m.id, { ...(sPct.get(m.id) ?? {}), [col.key]: sp.get(m.id) ?? NaN });
        fPct.set(m.id, { ...(fPct.get(m.id) ?? {}), [col.key]: fp.get(m.id) ?? NaN });
      }
    }
  }
  const out: Record<string, PlayerScore> = {};
  for (const p of active) {
    const w = cfg.weights(p.position);
    const sp = sPct.get(p.id) ?? {};
    const fp = fPct.get(p.id) ?? {};
    let tw = 0;
    let ss = 0;
    let fs = 0;
    const contributions: Contribution[] = [];
    for (const [k, wt] of Object.entries(w)) {
      const col = cfg.columns.find((c) => c.key === k);
      if (!col) continue;
      const a = Number.isFinite(sp[k]) ? sp[k] : NEUTRAL;
      const b = Number.isFinite(fp[k]) ? fp[k] : a;
      tw += wt;
      ss += wt * a;
      fs += wt * b;
      contributions.push({ key: k, label: col.label, weight: wt, pct: a, formPct: b });
    }
    const seasonScore = tw ? ss / tw : 0;
    const formScore = tw ? fs / tw : 0;
    const avail = AVAILABILITY[p.status];
    const s = season.get(p.id)!;
    out[p.id] = {
      id: p.id,
      seasonScore,
      formScore,
      avail,
      score: Math.round((SEASON_W * seasonScore + FORM_W * formScore) * avail * 10) / 10,
      gp: s.gp,
      stats: s.stats,
      formStats: form.get(p.id)!.stats,
      pcts: sp,
      contributions: contributions.sort((x, y) => y.weight - x.weight),
    };
  }
  return out;
}

/** Explicit team entries take precedence without changing any player box scores. */
export function gameTeamStats(state: SportState, game: Game): Raw {
  return game.teamStats ?? sumRaw(state.players.flatMap((p) => p.gameStats.filter((l) => l.gameId === game.id).map((l) => l.s)));
}

export function teamAgg(state: SportState, filter?: Set<string>): TeamAgg {
  const games = filter ? state.games.filter((g) => filter.has(g.id)) : state.games;
  return {
    totals: sumRaw(games.map((g) => gameTeamStats(state, g))),
    gp: Math.max(1, games.length),
    games,
    pf: games.reduce((a, g) => a + g.scoreFor, 0),
    pa: games.reduce((a, g) => a + g.scoreAgainst, 0),
    extra: sumRaw(games.map((g) => g.extra)),
  };
}

export function lastNIds(games: Game[], n: number | null) {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date));
  return new Set((n ? sorted.slice(-n) : sorted).map((g) => g.id));
}

export interface BenchRow {
  bench: Bench;
  value: number;
  gap: number;
  index: number;
}

/** Ranks team categories against a league benchmark. Index ~ percentile (50 = league average). */
export function benchmarkRows(cfg: SportConfig, agg: TeamAgg): BenchRow[] {
  return cfg.benchmarks
    .map((b) => {
      const value = b.value(agg);
      const gap = Number.isFinite(value) ? ((value - b.league) / b.league) * (b.higher ? 1 : -1) : 0;
      const index = Math.max(1, Math.min(99, Math.round(50 + gap * 250)));
      return { bench: b, value, gap, index };
    })
    .sort((a, b) => a.index - b.index);
}

export function record(games: Game[]) {
  let w = 0;
  let l = 0;
  let d = 0;
  for (const g of games) {
    if (g.scoreFor > g.scoreAgainst) w++;
    else if (g.scoreFor < g.scoreAgainst) l++;
    else d++;
  }
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date));
  const res = (g: Game) => (g.scoreFor > g.scoreAgainst ? 'W' : g.scoreFor < g.scoreAgainst ? 'L' : 'D');
  let streak = '';
  if (sorted.length) {
    const first = res(sorted[0]);
    let n = 0;
    for (const g of sorted) {
      if (res(g) === first) n++;
      else break;
    }
    streak = `${first}${n}`;
  }
  return { w, l, d, streak, res };
}

export const resultOf = (g: Game) => (g.scoreFor > g.scoreAgainst ? 'W' : g.scoreFor < g.scoreAgainst ? 'L' : 'D');

/** Auto-generated strengths and weaknesses for a player profile. */
export function strengthsWeaknesses(cfg: SportConfig, p: Player, scores: Record<string, PlayerScore>, players: Player[]) {
  const sc = scores[p.id];
  if (!sc || !sc.gp) return { strengths: [] as string[], weaknesses: [] as string[] };
  const w = cfg.weights(p.position);
  const pool = players.filter((x) => !x.removed && cfg.pool(x.position) === cfg.pool(p.position) && scores[x.id]?.gp);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const col of cfg.columns) {
    const pct = sc.pcts[col.key];
    if (!Number.isFinite(pct)) continue;
    const relevant = col.key in w;
    if (pct >= 80 && relevant) strengths.push(`Top ${Math.max(1, 100 - pct)}% of ${cfg.pool(p.position) === 'ALL' ? 'the team' : 'similar roles'} in ${col.desc.toLowerCase()}`);
    if (relevant) {
      const vals = pool.map((x) => colVal(col, scores[x.id].stats, scores[x.id].gp, 'pg')).filter(Number.isFinite);
      const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
      const mine = colVal(col, sc.stats, sc.gp, 'pg');
      if (Number.isFinite(mine) && vals.length > 1 && (col.higher ? mine < avg * 0.9 : mine > avg * 1.1)) weaknesses.push(`Below team average in ${col.desc.toLowerCase()}`);
    }
  }
  if (sc.formScore - sc.seasonScore > 8) strengths.push(`Hot streak: last-5 form ${sc.formScore.toFixed(0)} vs season ${sc.seasonScore.toFixed(0)}`);
  if (sc.seasonScore - sc.formScore > 8) weaknesses.push(`Cooling off: last-5 form ${sc.formScore.toFixed(0)} vs season ${sc.seasonScore.toFixed(0)}`);
  return { strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 5) };
}
