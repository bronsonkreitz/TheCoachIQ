/**
 * CoachIQ data model. Mirrors the PRD (section 12). Season stats are NOT stored:
 * they are always derived from per-game lines so every view stays consistent.
 */
export type SportId = 'basketball' | 'baseball' | 'soccer' | 'football' | 'hockey';
export type Status = 'Active' | 'Questionable' | 'Injured';
export type Raw = Record<string, number>;
export type Fmt = 'int' | 'd1' | 'd2' | 'pct' | 'avg' | 'ip' | 'signed';
export type Intensity = 'Low' | 'Medium' | 'High';
export type Phase = 'warmup' | 'skill' | 'scrimmage' | 'cooldown';

export interface GameLine {
  gameId: string;
  s: Raw;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: string;
  status: Status;
  age: number;
  height: string;
  weight: number;
  year: string;
  notes: string;
  /** Hidden simulation rating used only to generate plausible box scores. */
  skill: number;
  removed?: boolean;
  gameStats: GameLine[];
}

export interface Game {
  id: string;
  teamId: string;
  date: string;
  opponent: string;
  homeAway: 'Home' | 'Away';
  scoreFor: number;
  scoreAgainst: number;
  extra: Raw;
}

export interface Upcoming {
  id: string;
  date: string;
  opponent: string;
  homeAway: 'Home' | 'Away';
}

export interface LineupSlot {
  slotId: string;
  label: string;
  position: string;
  playerId: string | null;
}

export interface Lineup {
  id: string;
  teamId: string;
  name: string;
  slots: LineupSlot[];
  score: number;
  createdAt: string;
  formation?: string;
}

export interface Drill {
  id: string;
  name: string;
  focusTags: string[];
  durationMin: number;
  intensity: Intensity;
  equipment: string[];
  instructions: string;
  phase: Phase;
}

export interface PlanBlock {
  uid: string;
  drillId: string;
  minutes: number;
  phase: Phase;
  focus?: string;
  done: boolean;
}

export interface PracticePlan {
  id: string;
  teamId: string;
  name: string;
  lengthMin: number;
  intensity: Intensity;
  focusAreas: string[];
  blocks: PlanBlock[];
  createdAt: string;
  completed?: boolean;
}

export interface Team {
  id: string;
  sport: SportId;
  name: string;
  city: string;
  mascot: string;
  abbr: string;
  league: string;
  colors: [string, string];
}

export interface SportState {
  version: number;
  team: Team;
  players: Player[];
  games: Game[];
  upcoming: Upcoming[];
  lineups: Lineup[];
  plans: PracticePlan[];
  tools: Record<string, unknown>;
}
