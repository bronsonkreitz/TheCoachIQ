import { z } from 'zod';
import type { SportId, SportState } from '@/lib/types';
import { DATA_VERSION } from '@/data/generate';
import { SPORTS } from '@/sports';

const str = z.string();
const num = z.number().finite();
const raw = z.record(str, num);
const strings = z.array(str);
const phase = z.enum(['warmup', 'skill', 'scrimmage', 'cooldown']);
const intensity = z.enum(['Low', 'Medium', 'High']);
const homeAway = z.enum(['Home', 'Away']);

// Validate without transforming: optional fields, extension keys, and zero-stat
// appearances must survive a round trip exactly as they were saved.
const stateShape = z.object({
  version: z.literal(DATA_VERSION),
  team: z.object({
    id: str, sport: str, name: str, city: str, mascot: str, abbr: str,
    league: str, colors: z.tuple([str, str]),
  }),
  players: z.array(z.object({
    id: str, teamId: str, name: str, number: num, position: str,
    status: z.enum(['Active', 'Questionable', 'Injured']), age: num,
    height: str, weight: num, year: str, notes: str, skill: num,
    removed: z.boolean().optional(),
    gameStats: z.array(z.object({ gameId: str, s: raw })),
  })),
  games: z.array(z.object({
    id: str, teamId: str, date: str, opponent: str, homeAway,
    scoreFor: num, scoreAgainst: num, extra: raw, teamStats: raw.optional(),
  })),
  upcoming: z.array(z.object({ id: str, date: str, opponent: str, homeAway })),
  lineups: z.array(z.object({
    id: str, teamId: str, name: str, score: num, createdAt: str,
    formation: str.optional(),
    slots: z.array(z.object({ slotId: str, label: str, position: str, playerId: str.nullable() })),
  })),
  plans: z.array(z.object({
    id: str, teamId: str, name: str, lengthMin: num, intensity,
    focusAreas: strings, createdAt: str, completed: z.boolean().optional(),
    blocks: z.array(z.object({
      uid: str, drillId: str, minutes: num, phase, focus: str.optional(), done: z.boolean(),
    })),
  })),
  tools: z.record(str, z.unknown()),
});

const toolShapes: Record<string, z.ZodType> = {
  'basketball.rotation': z.record(str, z.tuple([num, num, num, num])),
  'baseball.order': strings,
  'baseball.pitchlog': z.array(z.object({
    id: str, pid: str, date: str, pitches: num, manual: z.boolean().optional(),
  })),
  'soccer.setpieces': z.record(str, str),
  'football.depth': z.record(str, strings),
  'football.plays': z.array(z.object({
    id: str, name: str, type: z.enum(['Run', 'Pass', 'Screen', 'Blitz']),
    formation: str, calls: num, success: num,
  })),
  'football.film': z.array(z.object({
    id: str, gameId: str, ts: str, tag: str, playerId: str, note: str, createdAt: str,
  })),
  'hockey.lines': z.record(str, str),
  'hockey.shots': z.array(z.object({
    id: str, gameId: str, x: num, y: num, result: z.enum(['Goal', 'Save', 'Miss']), playerId: str,
  })),
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validSport(value: unknown, sport: SportId): value is SportState {
  const parsed = stateShape.safeParse(value);
  if (!parsed.success) return false;
  const s = parsed.data;
  if (s.team.sport !== sport) return false;
  if (s.players.some((p) => p.teamId !== s.team.id || !SPORTS[sport].positions.includes(p.position))) return false;
  if ([...s.games, ...s.lineups, ...s.plans].some((v) => v.teamId !== s.team.id)) return false;
  if (s.plans.some((p) => p.blocks.some((b) => !SPORTS[sport].drills.some((d) => d.id === b.drillId)))) return false;
  const formations = SPORTS[sport].formations;
  if (formations && s.lineups.some((l) => l.formation && !Object.hasOwn(formations, l.formation))) return false;
  return Object.entries(toolShapes).every(([key, shape]) =>
    !Object.hasOwn(s.tools, key) || shape.safeParse(s.tools[key]).success,
  );
}
