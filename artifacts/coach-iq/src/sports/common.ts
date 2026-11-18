import type { Drill, Intensity, Phase, Raw } from '@/lib/types';

export const sumKey = (lines: Raw[], k: string) => lines.reduce((a, l) => a + (l[k] || 0), 0);
export const safeDiv = (a: number, b: number) => (b ? a / b : NaN);

export function drill(
  id: string,
  name: string,
  focusTags: string[],
  durationMin: number,
  intensity: Intensity,
  equipment: string[],
  instructions: string,
  phase: Phase = 'skill',
): Drill {
  return { id, name, focusTags, durationMin, intensity, equipment, instructions, phase };
}

/** Shared scoring rule copy (PRD section 11), shown on every Lineup and Practice page. */
export const SCORE_RULES = [
  'Every stat is converted to a percentile inside the team, comparing a player only against similar roles.',
  'Percentiles are combined with position-specific weights from the sport config.',
  'Season form counts 60%, the last 5 games count 40%.',
  'Availability multiplier: Active x1.0, Questionable x0.8, Injured x0.',
];
