import type { LineupSlot, Player } from './types';
import type { SlotDef, SportConfig } from '@/sports/types';
import { colVal, type PlayerScore } from './analytics';
import { ordinal } from './format';

export interface AutoResult {
  slots: LineupSlot[];
  reasons: Record<string, string>;
  notes: string[];
  bench: string[];
}

const eligible = (slot: SlotDef, p: Player) => slot.positions.includes(p.position);

export function whyPlayer(cfg: SportConfig, p: Player, sc: PlayerScore | undefined, slot: SlotDef) {
  if (!sc) return 'No data yet.';
  const top = [...sc.contributions].sort((a, b) => b.pct * b.weight - a.pct * a.weight)[0];
  const form = sc.formScore - sc.seasonScore;
  const formTxt = form > 6 ? ' Trending up over the last 5.' : form < -6 ? ' Form has dipped lately.' : '';
  const pos = p.position === slot.positions[0] ? '' : ` Covers ${slot.label} from ${p.position}.`;
  const avail = p.status === 'Questionable' ? ' Questionable (x0.8).' : '';
  return `Score ${sc.score.toFixed(1)}${top ? `, led by ${top.label} (${ordinal(Math.round(top.pct))} pct)` : ''}.${formTxt}${pos}${avail}`;
}

export function topIds(cfg: SportConfig, key: string, n: number, players: Player[], scores: Record<string, PlayerScore>) {
  const col = cfg.columns.find((c) => c.key === key);
  if (!col) return new Set<string>();
  const vals = players
    .filter((p) => scores[p.id]?.gp)
    .map((p) => ({ id: p.id, v: colVal(col, scores[p.id].stats, scores[p.id].gp, 'pg') }))
    .filter((x) => Number.isFinite(x.v))
    .sort((a, b) => (col.higher ? b.v - a.v : a.v - b.v));
  return new Set(vals.slice(0, n).map((x) => x.id));
}

/** Greedy builder: scarce slots first, best score per slot, then enforce balance rules. */
export function autoLineup(cfg: SportConfig, slots: SlotDef[], players: Player[], scores: Record<string, PlayerScore>, excludeInjured: boolean, benchSize = 0): AutoResult {
  const pool = players.filter((p) => !p.removed && (!excludeInjured || p.status !== 'Injured'));
  const order = [...slots].sort((a, b) => pool.filter((p) => eligible(a, p)).length - pool.filter((p) => eligible(b, p)).length);
  const used = new Set<string>();
  const pick: Record<string, string | null> = {};
  const sc = (id: string) => scores[id]?.score ?? 0;
  for (const slot of order) {
    // Prefer natural position, then fall back to secondary eligibility.
    const cands = pool.filter((p) => eligible(slot, p) && !used.has(p.id)).sort((a, b) => {
      const na = a.position === slot.positions[0] ? 4 : 0;
      const nb = b.position === slot.positions[0] ? 4 : 0;
      return sc(b.id) + nb - (sc(a.id) + na);
    });
    const best = cands[0];
    pick[slot.id] = best?.id ?? null;
    if (best) used.add(best.id);
  }
  const notes: string[] = [];
  for (const need of cfg.needs) {
    const top = topIds(cfg, need.key, need.topN, pool, scores);
    let have = Object.values(pick).filter((id) => id && top.has(id)).length;
    let guard = 0;
    while (have < need.min && guard++ < 3) {
      let best: { slot: SlotDef; cand: Player; out: string | null; cost: number } | null = null;
      for (const cand of pool.filter((p) => top.has(p.id) && !used.has(p.id))) {
        for (const slot of slots) {
          if (!eligible(slot, cand)) continue;
          const out = pick[slot.id];
          if (out && top.has(out)) continue;
          const cost = (out ? sc(out) : 0) - sc(cand.id);
          if (!best || cost < best.cost) best = { slot, cand, out, cost };
        }
      }
      if (!best) {
        notes.push(`Could not satisfy: ${need.label} (no eligible player).`);
        break;
      }
      if (best.out) used.delete(best.out);
      used.add(best.cand.id);
      pick[best.slot.id] = best.cand.id;
      const outName = best.out ? players.find((p) => p.id === best!.out)?.name : 'empty slot';
      notes.push(`Balance rule (${need.label}): ${best.cand.name} in for ${outName} at ${best.slot.label}.`);
      have++;
    }
    if (have >= need.min && !notes.some((n) => n.includes(need.label))) notes.push(`Rule met: ${need.label}.`);
  }
  const reasons: Record<string, string> = {};
  const out: LineupSlot[] = slots.map((s) => {
    const id = pick[s.id] ?? null;
    const p = id ? players.find((x) => x.id === id) : undefined;
    reasons[s.id] = p ? whyPlayer(cfg, p, scores[p.id], s) : 'No eligible player available.';
    return { slotId: s.id, label: s.label, position: s.positions[0], playerId: id };
  });
  const bench = pool
    .filter((p) => !Object.values(pick).includes(p.id) && p.status !== 'Injured')
    .sort((a, b) => sc(b.id) - sc(a.id))
    .slice(0, benchSize)
    .map((p) => p.id);
  return { slots: out, reasons, notes, bench };
}

export function lineupScore(slots: LineupSlot[], scores: Record<string, PlayerScore>) {
  const filled = slots.filter((s) => s.playerId);
  if (!slots.length) return 0;
  const total = filled.reduce((a, s) => a + (scores[s.playerId!]?.score ?? 0), 0);
  return Math.round((total / slots.length) * 10) / 10;
}
