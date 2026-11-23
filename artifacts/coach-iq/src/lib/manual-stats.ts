import type { Raw, SportId } from './types';
import type { SportConfig } from '@/sports/types';

/** Game-level values that cannot be obtained by adding player box scores. */
export const TEAM_FIELDS: Record<SportId, { key: string; label: string; max?: number }[]> = {
  basketball: [{ key: 'oppReb', label: 'Opponent rebounds' }],
  baseball: [],
  soccer: [{ key: 'poss', label: 'Team possession (%)', max: 100 }],
  football: [{ key: 'oppYds', label: 'Opponent total yards' }],
  hockey: [{ key: 'oppSh', label: 'Opponent shots' }],
};

export function statEntryError(cfg: SportConfig, raw: Raw): string | null {
  const signed = new Set(['pmn', ...(cfg.id === 'football' ? ['pyd', 'ryd', 'recyd'] : [])]);
  for (const field of cfg.rawKeys) {
    const v = raw[field.key] ?? 0;
    if (!Number.isFinite(v)) return `${field.label} must be a finite number.`;
    if (!signed.has(field.key) && v < 0) return `${field.label} cannot be negative.`;
    const fractional = ['min', 'toi', 'gtoi', 'sck'].includes(field.key);
    if (!fractional && !Number.isInteger(v)) return `${field.label} must be a whole number.`;
  }
  const pairs: Record<SportId, [string, string][]> = {
    basketball: [['fgm', 'fga'], ['tpm', 'tpa'], ['ftm', 'fta'], ['tpm', 'fgm'], ['tpa', 'fga']],
    baseball: [['h', 'ab'], ['ab', 'pa'], ['e', 'ch']],
    soccer: [['g', 'sot'], ['sot', 'sh'], ['pc', 'pa']],
    football: [['pcmp', 'patt'], ['fgm', 'fga'], ['xpm', 'xpa']],
    hockey: [['g', 'sh'], ['ga', 'sa']],
  };
  for (const [made, attempts] of pairs[cfg.id]) {
    if ((raw[made] ?? 0) > (raw[attempts] ?? 0)) {
      const label = (key: string) => cfg.rawKeys.find((f) => f.key === key)?.label ?? key;
      return `${label(made)} cannot exceed ${label(attempts)}.`;
    }
  }
  if (cfg.id === 'baseball' && (raw.d || 0) + (raw.t || 0) + (raw.hr || 0) > (raw.h || 0)) {
    return 'Doubles, triples and home runs cannot exceed total hits.';
  }
  return null;
}
