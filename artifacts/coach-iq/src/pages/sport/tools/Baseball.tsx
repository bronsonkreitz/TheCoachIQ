import { useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useSport, useTool } from '@/store/sport-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmt, fmtDate } from '@/lib/format';
import { uid } from '@/lib/rng';
import { cn } from '@/lib/utils';
import { PlayerPick, addDays, todayIso } from './shared';

const ROLE = ['Leadoff (best OBP)', '2nd (OBP)', '3rd (best OPS)', 'Cleanup (best SLG)', '5th', '6th', '7th', '8th', '9th'];

export function BattingOrder() {
  const { roster, scores } = useSport();
  const hitters = roster.filter((p) => p.position !== 'P' && p.status !== 'Injured' && scores[p.id]?.gp);
  const st = (id: string, k: string) => scores[id]?.stats[k] ?? 0;
  const [order, setOrder] = useTool<string[]>('baseball.order', []);
  const auto = () => {
    const pool = [...hitters];
    const take = (k: string) => {
      pool.sort((a, b) => st(b.id, k) - st(a.id, k));
      return pool.shift()!.id;
    };
    const o: string[] = [];
    if (pool.length) o[0] = take('obp');
    if (pool.length) o[1] = take('obp');
    const cleanup = pool.length ? take('slg') : undefined;
    if (pool.length) o[2] = take('ops');
    if (cleanup) o[3] = cleanup;
    pool.sort((a, b) => st(b.id, 'ops') - st(a.id, 'ops'));
    setOrder([...o.filter(Boolean), ...pool.map((p) => p.id)].slice(0, 9));
  };
  const list = order.filter((id) => hitters.some((h) => h.id === id));
  const move = (i: number, d: number) => {
    const n = [...list];
    if (i + d < 0 || i + d >= n.length) return;
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setOrder(n);
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Auto rank: top two OBP lead off, best remaining SLG bats cleanup, best OPS bats third, the rest by OPS.</p>
        <Button size="sm" onClick={auto}>Auto rank order</Button>
      </div>
      {!list.length ? <p className="text-sm text-muted-foreground">No order saved yet. Press Auto rank order.</p> : (
        <ol className="space-y-1.5">
          {list.map((id, i) => {
            const p = hitters.find((h) => h.id === id)!;
            return (
              <li key={id} className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2 sm:grid-cols-[2rem_1fr_10rem_auto_auto]">
                <span className="font-display text-xl font-black text-sport">{i + 1}</span>
                <span className="font-medium">{p.name} <span className="text-xs text-muted-foreground">{p.position}</span></span>
                <span className="hidden text-xs text-muted-foreground sm:block">{ROLE[i]}</span>
                <span className="text-xs tabular">OBP {fmt(st(id, 'obp'), 'avg')} · SLG {fmt(st(id, 'slg'), 'avg')}</span>
                <span className="flex">
                  <button aria-label="Move up" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted"><ArrowUp className="h-4 w-4" /></button>
                  <button aria-label="Move down" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted"><ArrowDown className="h-4 w-4" /></button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Rest rule (youth-style pitch smart guidelines). */
export const restDays = (pc: number) => (pc >= 66 ? 4 : pc >= 51 ? 3 : pc >= 36 ? 2 : pc >= 21 ? 1 : 0);
interface Outing { id: string; pid: string; date: string; pitches: number; manual?: boolean }

function useOutings() {
  const { s, roster } = useSport();
  const [logs, setLogs] = useTool<Outing[]>('baseball.pitchlog', []);
  const pitchers = roster.filter((p) => p.position === 'P');
  const gd = new Map(s.games.map((g) => [g.id, g.date]));
  const fromGames: Outing[] = pitchers.flatMap((p) => p.gameStats.filter((l) => (l.s.pc ?? 0) > 0).map((l) => ({ id: `${p.id}-${l.gameId}`, pid: p.id, date: gd.get(l.gameId) ?? '', pitches: l.s.pc })));
  const all = [...fromGames, ...logs.map((l) => ({ ...l, manual: true }))].sort((a, b) => b.date.localeCompare(a.date));
  return { all, logs, setLogs, pitchers };
}

export function PitchCount() {
  const { all, logs, setLogs, pitchers } = useOutings();
  const [pid, setPid] = useState('');
  const [date, setDate] = useState(todayIso());
  const [pc, setPc] = useState('');
  const n = Number(pc);
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3" onSubmit={(e) => { e.preventDefault(); if (!pid || !(n > 0)) return; setLogs([...logs, { id: uid('po'), pid, date, pitches: n }]); setPc(''); }}>
        <div className="min-w-[200px] flex-1"><PlayerPick label="Pitcher" value={pid} onChange={setPid} players={pitchers} /></div>
        <Input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        <Input type="number" aria-label="Pitches" placeholder="Pitches" value={pc} onChange={(e) => setPc(e.target.value)} className="w-28" />
        <Button type="submit" disabled={!pid || !(n > 0)}>Log outing</Button>
        {n > 0 && <span className="text-sm">Requires <b className="text-sport">{restDays(n)}</b> rest day{restDays(n) === 1 ? '' : 's'}</span>}
      </form>
      <p className="text-xs text-muted-foreground">Rest rule: 1-20 pitches 0 days · 21-35 1 day · 36-50 2 days · 51-65 3 days · 66+ 4 days. Game box-score pitch counts are included automatically.</p>
      <div className="scrollbar-thin max-h-96 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2 text-left">Date</th><th className="text-left">Pitcher</th><th className="text-right">Pitches</th><th className="text-right">Rest</th><th className="px-3 text-right">Available</th><th /></tr></thead>
          <tbody>
            {all.slice(0, 40).map((o) => (
              <tr key={o.id} className="border-t border-border/60">
                <td className="px-3 py-1.5 tabular">{fmtDate(o.date)}</td>
                <td>{pitchers.find((p) => p.id === o.pid)?.name}{o.manual && <span className="ml-1 text-[10px] text-sport">logged</span>}</td>
                <td className="text-right tabular">{o.pitches}</td>
                <td className="text-right tabular">{restDays(o.pitches)}d</td>
                <td className="px-3 text-right tabular">{fmtDate(addDays(o.date, restDays(o.pitches) + 1))}</td>
                <td>{o.manual && <button aria-label="Delete outing" onClick={() => setLogs(logs.filter((l) => l.id !== o.id))} className="p-1 text-muted-foreground hover:text-bad"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Bullpen() {
  const { all, pitchers } = useOutings();
  const { scores } = useSport();
  const [asOf, setAsOf] = useState(todayIso());
  const rows = pitchers.map((p) => {
    const mine = all.filter((o) => o.pid === p.id && o.date <= asOf);
    const last = mine[0];
    const availOn = last ? addDays(last.date, restDays(last.pitches) + 1) : asOf;
    const week = mine.filter((o) => o.date > addDays(asOf, -7)).reduce((a, o) => a + o.pitches, 0);
    const fatigue = Math.min(100, Math.round((week / 120) * 100));
    const ready = p.status !== 'Injured' && availOn <= asOf;
    return { p, last, availOn, week, fatigue, ready };
  }).sort((a, b) => Number(b.ready) - Number(a.ready) || a.fatigue - b.fatigue);
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm">As of <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40" /></label>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ p, last, availOn, week, fatigue, ready }) => (
          <li key={p.id} className={cn('rounded-xl border p-3', ready ? 'border-good/40' : 'border-bad/40')}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{p.name} <span className="text-xs text-muted-foreground">ERA {fmt(scores[p.id]?.stats.era ?? NaN, 'd2')}</span></p>
              <span className={cn('rounded px-2 py-0.5 text-xs font-bold', ready ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad')}>{p.status === 'Injured' ? 'Injured' : ready ? 'Available' : `Rest until ${fmtDate(availOn)}`}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Last: {last ? `${last.pitches} pitches on ${fmtDate(last.date)}` : 'none'} · 7-day load {week}</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted"><div className={cn('h-full rounded-full', fatigue > 75 ? 'bg-bad' : fatigue > 45 ? 'bg-amber-300' : 'bg-good')} style={{ width: `${Math.max(3, fatigue)}%` }} /></div>
            <p className="mt-1 text-[11px] text-muted-foreground">Fatigue {fatigue}%</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
