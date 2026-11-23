import type { Drill, Intensity, PlanBlock } from './types';
import type { SportConfig } from '@/sports/types';
import type { BenchRow } from './analytics';
import { uid } from './rng';

const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
const INT_ORDER: Intensity[] = ['Low', 'Medium', 'High'];

export interface PlanOptions {
  lengthMin: number;
  intensity: Intensity;
  focus: BenchRow[];
}

/**
 * Practice generator: warm-up, weighted skill blocks for the focus areas
 * (50/30/20 split for three areas), a scrimmage, then a cool-down.
 */
export function generatePlan(cfg: SportConfig, opts: PlanOptions): PlanBlock[] {
  const L = opts.lengthMin;
  const byPhase = (ph: Drill['phase']) => cfg.drills.filter((d) => d.phase === ph);
  const warm = byPhase('warmup')[0];
  const scrim = byPhase('scrimmage')[0];
  const cool = byPhase('cooldown')[0];
  const warmMin = r5(Math.max(8, L * 0.12));
  const coolMin = r5(Math.max(5, L * 0.07));
  const scrimShare = opts.intensity === 'Low' ? 0.12 : opts.intensity === 'High' ? 0.27 : 0.2;
  const scrimMin = r5(L * scrimShare);
  let skillMin = L - warmMin - coolMin - scrimMin;
  const blocks: PlanBlock[] = [];
  if (warm) blocks.push({ uid: uid('b'), drillId: warm.id, minutes: warmMin, phase: 'warmup', done: false });
  const focus = opts.focus.length ? opts.focus : [];
  const shares = focus.length === 1 ? [1] : focus.length === 2 ? [0.6, 0.4] : [0.5, 0.3, 0.2];
  const used = new Set<string>();
  const ti = INT_ORDER.indexOf(opts.intensity);
  focus.forEach((row, i) => {
    // Rounding early shares up must leave at least five minutes per later focus.
    const reserve = (focus.length - i - 1) * 5;
    let m = i === focus.length - 1 ? skillMin : Math.min(r5((L - warmMin - coolMin - scrimMin) * shares[i]), skillMin - reserve);
    skillMin -= m;
    const cands = cfg.drills
      .filter((d) => d.phase === 'skill' && d.focusTags.some((t) => row.bench.tags.includes(t)))
      .sort((a, b) => {
        const ua = used.has(a.id) ? 10 : 0;
        const ub = used.has(b.id) ? 10 : 0;
        const ia = Math.abs(INT_ORDER.indexOf(a.intensity) - ti);
        const ib = Math.abs(INT_ORDER.indexOf(b.intensity) - ti);
        const ta = a.focusTags.indexOf(row.bench.tags[0]) === 0 ? -0.5 : 0;
        const tb = b.focusTags.indexOf(row.bench.tags[0]) === 0 ? -0.5 : 0;
        return ua + ia + ta - (ub + ib + tb);
      });
    const picks = m >= 20 && cands.length > 1 ? cands.slice(0, 2) : cands.slice(0, 1);
    if (!picks.length) return;
    picks.forEach((d, j) => {
      const mins = j === picks.length - 1 ? m : r5(m / picks.length);
      m -= mins;
      used.add(d.id);
      blocks.push({ uid: uid('b'), drillId: d.id, minutes: mins, phase: 'skill', focus: row.bench.label, done: false });
    });
  });
  if (scrim) blocks.push({ uid: uid('b'), drillId: scrim.id, minutes: scrimMin + Math.max(0, skillMin), phase: 'scrimmage', done: false });
  if (cool) blocks.push({ uid: uid('b'), drillId: cool.id, minutes: coolMin, phase: 'cooldown', done: false });
  return blocks;
}
