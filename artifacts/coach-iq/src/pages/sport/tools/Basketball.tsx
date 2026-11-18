import { useState } from 'react';
import { useSport, useTool } from '@/store/sport-context';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/coach/ui';
import { cn } from '@/lib/utils';
import { byScore } from './shared';

const ZONES = [
  { k: 'zp', label: 'Paint', x: 50, y: 22 },
  { k: 'zm', label: 'Midrange', x: 50, y: 52 },
  { k: 'zc', label: 'Corner 3', x: 7, y: 14 },
  { k: 'za', label: 'Above break 3', x: 50, y: 86 },
];

export function ShotChart() {
  const { roster } = useSport();
  const [pid, setPid] = useState('team');
  const list = pid === 'team' ? roster : roster.filter((p) => p.id === pid);
  const tot = (k: string) => list.reduce((a, p) => a + p.gameStats.reduce((b, l) => b + (l.s[k] ?? 0), 0), 0);
  const z = Object.fromEntries(ZONES.map((d) => [d.k, { a: tot(`${d.k}A`), m: tot(`${d.k}M`) }]));
  const pct = (k: string) => (z[k].a ? z[k].m / z[k].a : 0);
  const fill = (k: string) => `hsl(var(--sport) / ${(0.08 + pct(k) * 0.75).toFixed(2)})`;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <NativeSelect aria-label="Player" value={pid} onChange={(e) => setPid(e.target.value)} className="mb-3">
          <option value="team">Whole team</option>
          {roster.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </NativeSelect>
        <svg viewBox="0 0 100 94" className="w-full rounded-2xl border border-border bg-surface/50" role="img" aria-label="Half-court shot chart, zones shaded by field goal percentage">
          {/* above-break 3 region = whole court; arc region clipped by drawing inner zones on top */}
          <rect x="0" y="0" width="100" height="94" fill={fill('za')} />
          <path d="M6 0 V28 A44 44 0 0 0 94 28 V0 Z" fill={fill('zm')} stroke="hsl(var(--foreground) / 0.5)" strokeWidth="0.5" />
          <rect x="0" y="0" width="6" height="28" fill={fill('zc')} stroke="hsl(var(--foreground) / 0.5)" strokeWidth="0.5" />
          <rect x="94" y="0" width="6" height="28" fill={fill('zc')} stroke="hsl(var(--foreground) / 0.5)" strokeWidth="0.5" />
          <rect x="34" y="0" width="32" height="38" fill={fill('zp')} stroke="hsl(var(--foreground) / 0.5)" strokeWidth="0.5" />
          <circle cx="50" cy="38" r="12" fill="none" stroke="hsl(var(--foreground) / 0.3)" strokeWidth="0.4" />
          <circle cx="50" cy="5.5" r="1.6" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
          <line x1="44" y1="4" x2="56" y2="4" stroke="hsl(var(--foreground))" strokeWidth="0.6" />
          {ZONES.map((d) => (
            <g key={d.k}>
              <text x={d.k === 'zc' ? 3 : d.x} y={d.y} textAnchor="middle" fontSize={d.k === 'zc' ? 2.6 : 4.5} fontWeight="800" fill="hsl(var(--foreground))">{(pct(d.k) * 100).toFixed(0)}%</text>
              {d.k !== 'zc' && <text x={d.x} y={d.y + 4} textAnchor="middle" fontSize="2.6" fill="hsl(var(--foreground) / 0.7)">{d.label} {z[d.k].m}/{z[d.k].a}</text>}
            </g>
          ))}
          <text x="97" y="31" textAnchor="middle" fontSize="2.4" fill="hsl(var(--foreground) / 0.7)">{(pct('zc') * 100).toFixed(0)}%</text>
        </svg>
      </div>
      <table className="h-fit w-full text-sm">
        <thead className="text-[11px] uppercase text-muted-foreground"><tr><th className="py-2 text-left">Zone</th><th className="text-right">FGM/FGA</th><th className="text-right">FG%</th><th className="text-right">Share</th></tr></thead>
        <tbody>
          {ZONES.map((d) => {
            const all = ZONES.reduce((a, x) => a + z[x.k].a, 0);
            return (
              <tr key={d.k} className="border-t border-border/60">
                <td className="py-2">{d.label}</td>
                <td className="text-right tabular">{z[d.k].m}/{z[d.k].a}</td>
                <td className="text-right font-semibold tabular text-sport">{(pct(d.k) * 100).toFixed(1)}%</td>
                <td className="text-right tabular">{all ? ((z[d.k].a / all) * 100).toFixed(1) : 0}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Rot = Record<string, [number, number, number, number]>;

export function Rotation() {
  const { roster, scores } = useSport();
  const players = byScore(roster, scores);
  const [rot, setRot] = useTool<Rot>('basketball.rotation', {});
  const get = (id: string) => rot[id] ?? [0, 0, 0, 0];
  const set = (id: string, q: number, v: number) => {
    const cur = [...get(id)] as Rot[string];
    cur[q] = Math.max(0, Math.min(12, v));
    setRot({ ...rot, [id]: cur });
  };
  const auto = () => {
    const out: Rot = {};
    const avail = players.filter((p) => p.status !== 'Injured');
    const top = avail.slice(0, 5);
    const bench = avail.slice(5, 9);
    for (const p of avail) out[p.id] = [0, 0, 0, 0];
    for (let q = 0; q < 4; q++) {
      top.forEach((p) => (out[p.id][q] = 9));
      bench.forEach((p, i) => (out[p.id][q] = i === 0 ? 4 : i === 1 ? 4 : i === 2 ? 4 : 3));
    }
    setRot(out);
  };
  const qTot = [0, 1, 2, 3].map((q) => players.reduce((a, p) => a + get(p.id)[q], 0));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Each quarter needs 60 player-minutes (5 on court x 12). Injured players are locked to 0.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={auto}>Auto rotation</Button>
          <Button size="sm" variant="outline" onClick={() => setRot({})}>Clear</Button>
        </div>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-[11px] uppercase text-muted-foreground">
            <tr><th className="py-2 text-left">Player</th>{['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <th key={q} className="text-center">{q}</th>)}<th className="text-right">Total</th></tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const m = get(p.id);
              const t = m.reduce((a, b) => a + b, 0);
              return (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-1.5">{p.name} <span className="text-xs text-muted-foreground">{p.position}{p.status !== 'Active' ? ` · ${p.status}` : ''}</span></td>
                  {m.map((v, q) => (
                    <td key={q} className="text-center">
                      <input type="number" min={0} max={12} disabled={p.status === 'Injured'} aria-label={`${p.name} Q${q + 1} minutes`} value={v} onChange={(e) => set(p.id, q, Number(e.target.value) || 0)} className="h-7 w-14 rounded-md border border-input bg-background/70 text-center tabular disabled:opacity-40" />
                    </td>
                  ))}
                  <td className={cn('text-right font-semibold tabular', t > 36 && 'text-bad')}>{t}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-sport/40 font-semibold">
              <td className="py-2">Quarter total</td>
              {qTot.map((t, i) => <td key={i} className={cn('text-center tabular', t === 60 ? 'text-good' : 'text-bad')}>{t}/60</td>)}
              <td className="text-right tabular">{qTot.reduce((a, b) => a + b, 0)}/240</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
