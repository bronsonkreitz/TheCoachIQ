import type { Drill, Fmt, Game, Player, Raw, SportId, Team } from '@/lib/types';
import type { Rng } from '@/lib/rng';

/** A display column. `count` columns are totals that can be shown per game. */
export interface StatCol {
  key: string;
  label: string;
  fmt: Fmt;
  higher: boolean;
  count: boolean;
  desc: string;
}

export interface SlotDef {
  id: string;
  label: string;
  positions: string[];
  x: number;
  y: number;
  unit?: string;
}

/** Team-balance rule: at least `min` starters must be in the team top-N for `key`. */
export interface Need {
  key: string;
  label: string;
  topN: number;
  min: number;
}

export interface TeamAgg {
  totals: Raw;
  gp: number;
  games: Game[];
  pf: number;
  pa: number;
  extra: Raw;
}

export interface Bench {
  key: string;
  label: string;
  value: (a: TeamAgg) => number;
  league: number;
  higher: boolean;
  fmt: Fmt;
  tags: string[];
}

export interface Kpi {
  label: string;
  value: (a: TeamAgg) => number;
  fmt: Fmt;
  higher: boolean;
}

export interface GenCtx {
  rng: Rng;
  gi: number;
}

export interface GenResult {
  lines: Record<string, Raw>;
  scoreAgainst: number;
  extra: Raw;
}

export interface RawKey {
  key: string;
  label: string;
  /** Computed from other raw keys, not editable. */
  calc?: boolean;
}

export interface SportConfig {
  id: SportId;
  name: string;
  number: string;
  accent: string; // "H S% L%"
  hex: string;
  tagline: string;
  blurb: string;
  image: string;
  surface: 'court' | 'diamond' | 'pitch' | 'gridiron' | 'rink';
  scoreUnit: string;
  allowDraws: boolean;
  defaultMode: 'pg' | 'tot';
  team: Team;
  opponents: string[];
  seasonStart: string;
  cadenceDays: number;
  years: string[];
  ageRange: [number, number];
  size: (pos: string) => [number, number, number, number];
  positions: string[];
  positionNames: Record<string, string>;
  /** Percentile pool for a position (players are only ranked against similar roles). */
  pool: (pos: string) => string;
  unit?: (pos: string) => string;
  rosterPlan: { pos: string; count: number }[];
  rawKeys: RawKey[];
  normalize?: (s: Raw) => Raw;
  columns: StatCol[];
  derive: (t: Raw, gp: number) => Record<string, number>;
  rosterCols: string[];
  weights: (pos: string) => Record<string, number>;
  primary: string;
  kpis: Kpi[];
  benchmarks: Bench[];
  slots: SlotDef[];
  formations?: Record<string, SlotDef[]>;
  needs: Need[];
  rules: string[];
  drills: Drill[];
  genGame: (players: Player[], ctx: GenCtx) => GenResult;
  teamScore: (lines: Raw[]) => number;
  tools: { id: string; label: string; desc: string }[];
}
