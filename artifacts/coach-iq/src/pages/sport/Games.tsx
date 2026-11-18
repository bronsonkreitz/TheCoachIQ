import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSport } from '@/store/sport-context';
import { resultOf } from '@/lib/analytics';
import { fmtDate } from '@/lib/format';
import type { Upcoming } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/coach/ui';
import { AddGameDialog, GameDetailDialog } from '@/components/coach/GameDialogs';

export default function Games() {
  const { s } = useSport();
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState<Upcoming | null>(null);
  const past = [...s.games].sort((a, b) => b.date.localeCompare(a.date));
  const game = s.games.find((g) => g.id === sel) ?? null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-3xl font-black uppercase">Game log and schedule</h2>
        <Button onClick={() => { setFrom(null); setAdding(true); }} data-testid="button-add-game"><Plus /> Add game result</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Results" bodyClass="p-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>{['Date', 'Opponent', 'H/A', 'Score', 'Result'].map((h) => <th key={h} scope="col" className="px-4 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {past.map((g) => {
                  const r = resultOf(g);
                  return (
                    <tr key={g.id} className="cursor-pointer border-t border-border/60 hover:bg-sport/[0.05]" onClick={() => setSel(g.id)} data-testid={`row-game-${g.id}`}>
                      <td className="px-4 py-2.5 tabular">{fmtDate(g.date)}</td>
                      <td className="px-4 py-2.5 font-medium"><button className="text-left hover:text-sport" onClick={() => setSel(g.id)}>{g.opponent}</button></td>
                      <td className="px-4 py-2.5">{g.homeAway}</td>
                      <td className="px-4 py-2.5 font-semibold tabular">{g.scoreFor}-{g.scoreAgainst}</td>
                      <td className="px-4 py-2.5"><span className={cn('rounded px-2 py-0.5 text-xs font-bold', r === 'W' ? 'bg-good/15 text-good' : r === 'L' ? 'bg-bad/15 text-bad' : 'bg-muted')}>{r}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Upcoming">
          {!s.upcoming.length ? <p className="text-sm text-muted-foreground">No games scheduled.</p> : (
            <ul className="space-y-2">
              {[...s.upcoming].sort((a, b) => a.date.localeCompare(b.date)).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div>
                    <p className="font-semibold">{u.homeAway === 'Home' ? 'vs' : 'at'} {u.opponent}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(u.date, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setFrom(u); setAdding(true); }}>Enter result</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <AddGameDialog open={adding} onOpenChange={setAdding} from={from} />
      <GameDetailDialog game={game} onOpenChange={(o) => !o && setSel(null)} />
    </div>
  );
}
