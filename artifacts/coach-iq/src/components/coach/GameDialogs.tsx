import { useEffect, useMemo, useState } from 'react';
import { Dices, Eraser, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Game, Player, Raw, Upcoming } from '@/lib/types';
import { useSport } from '@/store/sport-context';
import { addGame, boxFor, deleteGame, hasData, updateGame } from '@/store/actions';
import { mulberry32, uid } from '@/lib/rng';
import { fmtDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Field, NativeSelect } from './ui';
import type { SportConfig } from '@/sports/types';

export function BoxScoreGrid({ cfg, players, lines, editable, onChange }: { cfg: SportConfig; players: Player[]; lines: Record<string, Raw>; editable: boolean; onChange?: (id: string, key: string, v: number) => void }) {
  const rows = editable ? players : players.filter((p) => lines[p.id]);
  const keys = editable ? cfg.rawKeys : cfg.rawKeys.filter((k) => rows.some((p) => (lines[p.id]?.[k.key] ?? 0) !== 0));
  const totals = Object.fromEntries(keys.map((k) => [k.key, rows.reduce((a, p) => a + (lines[p.id]?.[k.key] ?? 0), 0)]));
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No player lines recorded.</p>;
  return (
    <div className="scrollbar-thin max-h-[52dvh] w-full min-w-0 max-w-full overflow-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Box score</caption>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left">Player</th>
            {keys.map((k) => (
              <th key={k.key} scope="col" className="px-2 py-2 text-right font-semibold">
                {k.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-border/60">
              <th scope="row" className="sticky left-0 z-[1] whitespace-nowrap bg-card px-3 py-1.5 text-left font-medium">
                <span className="mr-1.5 text-xs text-muted-foreground tabular">#{p.number}</span>
                {p.name}
                <span className="ml-1.5 text-[10px] font-bold text-sport">{p.position}</span>
                {p.removed && <span className="ml-1 text-[10px] text-muted-foreground">(removed)</span>}
              </th>
              {keys.map((k) => {
                const v = lines[p.id]?.[k.key] ?? 0;
                return (
                  <td key={k.key} className="px-1 py-1 text-right tabular">
                    {editable && !k.calc ? (
                      <input
                        type="number"
                        aria-label={`${p.name} ${k.label}`}
                        value={v}
                        onChange={(e) => onChange?.(p.id, k.key, Number(e.target.value) || 0)}
                        className="h-7 w-14 rounded-md border border-input bg-background/70 px-1.5 text-right text-xs focus-visible:outline-2"
                      />
                    ) : (
                      <span className={cn(v === 0 && 'text-muted-foreground/50')}>{Number.isInteger(v) ? v : v.toFixed(1)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-sport/40 bg-sport/5 font-semibold">
            <th scope="row" className="sticky left-0 bg-card px-3 py-2 text-left">Team</th>
            {keys.map((k) => (
              <td key={k.key} className="px-2 py-2 text-right tabular">
                {Number.isInteger(totals[k.key]) ? totals[k.key] : totals[k.key].toFixed(1)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function useLinesState(initial: Record<string, Raw>, cfg: SportConfig) {
  const [lines, setLines] = useState<Record<string, Raw>>(initial);
  const set = (id: string, key: string, v: number) =>
    setLines((l) => {
      const row = { ...(l[id] ?? Object.fromEntries(cfg.rawKeys.map((k) => [k.key, 0]))), [key]: v };
      return { ...l, [id]: cfg.normalize ? cfg.normalize(row) : row };
    });
  return { lines, setLines, set };
}

export function AddGameDialog({ open, onOpenChange, from }: { open: boolean; onOpenChange: (o: boolean) => void; from?: Upcoming | null }) {
  const { cfg, s, roster, update } = useSport();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [opp, setOpp] = useState('');
  const [ha, setHa] = useState<'Home' | 'Away'>('Home');
  const [against, setAgainst] = useState('0');
  const [err, setErr] = useState<string | null>(null);
  const { lines, setLines, set } = useLinesState({}, cfg);
  const eligible = useMemo(() => roster.filter((p) => p.status !== 'Injured'), [roster]);
  useEffect(() => {
    if (!open) return;
    setDate(from?.date ?? today);
    setOpp(from?.opponent ?? '');
    setHa(from?.homeAway ?? 'Home');
    setAgainst('0');
    setErr(null);
    setLines({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, from?.id]);
  const scoreFor = cfg.teamScore(Object.values(lines));
  const simulate = () => {
    const res = cfg.genGame(eligible, { rng: mulberry32(Date.now() % 1e9), gi: s.games.length });
    setLines(res.lines);
    setAgainst(String(res.scoreAgainst));
  };
  const save = () => {
    const sa = Number(against);
    if (!opp.trim()) return setErr('Enter the opponent name.');
    if (!date) return setErr('Pick a game date.');
    if (!Number.isFinite(sa) || sa < 0) return setErr(`${cfg.scoreUnit} against must be 0 or more.`);
    if (!Object.values(lines).some(hasData)) return setErr('Enter at least one player line, or press Simulate box score.');
    if (!cfg.allowDraws && sa === scoreFor) return setErr(`${cfg.name} games cannot end tied. Adjust the box score or the opponent score.`);
    const id = uid(`${cfg.id.slice(0, 2)}-g`);
    update((st) => addGame(cfg, st, { id, teamId: st.team.id, date, opponent: opp.trim(), homeAway: ha, scoreAgainst: sa, extra: cfg.id === 'soccer' ? { poss: 50 } : {} }, lines, from?.id));
    toast({ title: 'Result added', description: `${scoreFor}-${sa} vs ${opp}. Stats, charts, lineups and practice focus updated.` });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">Add game result</DialogTitle>
          <DialogDescription>Team {cfg.scoreUnit.toLowerCase()} are calculated from the box score so totals always add up.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Date" htmlFor="ag-date">
            <Input id="ag-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-game-date" />
          </Field>
          <Field label="Opponent" htmlFor="ag-opp" className="sm:col-span-2">
            <Input id="ag-opp" value={opp} onChange={(e) => setOpp(e.target.value)} placeholder="e.g. Pinecrest Owls" data-testid="input-game-opponent" />
          </Field>
          <Field label="Venue" htmlFor="ag-ha">
            <NativeSelect id="ag-ha" className="w-full" value={ha} onChange={(e) => setHa(e.target.value as 'Home' | 'Away')} data-testid="select-game-venue">
              <option>Home</option>
              <option>Away</option>
            </NativeSelect>
          </Field>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-surface/60 p-4">
          <div className="flex items-end gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.team.abbr} (from box)</p>
              <p className="font-display text-4xl font-black text-sport tabular" data-testid="text-score-for">
                {scoreFor}
              </p>
            </div>
            <span className="pb-2 text-muted-foreground">vs</span>
            <Field label={`${cfg.scoreUnit} against`} htmlFor="ag-against">
              <Input id="ag-against" type="number" min={0} className="w-24 text-lg font-bold" value={against} onChange={(e) => setAgainst(e.target.value)} data-testid="input-score-against" />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLines({})} data-testid="button-clear-box">
              <Eraser /> Clear
            </Button>
            <Button variant="secondary" size="sm" onClick={simulate} data-testid="button-simulate-box">
              <Dices /> Simulate box score
            </Button>
          </div>
        </div>
        <BoxScoreGrid cfg={cfg} players={eligible} lines={lines} editable onChange={set} />
        {err && (
          <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
            {err}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} data-testid="button-save-game">
            Save result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GameDetailDialog({ game, onOpenChange }: { game: Game | null; onOpenChange: (o: boolean) => void }) {
  const { cfg, s, update } = useSport();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [against, setAgainst] = useState('0');
  const { lines, setLines, set } = useLinesState({}, cfg);
  useEffect(() => {
    if (game) {
      setLines(boxFor(s, game.id));
      setAgainst(String(game.scoreAgainst));
      setEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);
  if (!game) return null;
  const players = s.players.filter((p) => !p.removed || lines[p.id]);
  const sf = editing ? cfg.teamScore(game.teamStats ? [game.teamStats] : Object.values(lines)) : game.scoreFor;
  const res = sf > Number(against) ? 'W' : sf < Number(against) ? 'L' : 'D';
  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">
            {game.homeAway === 'Home' ? 'vs' : 'at'} {game.opponent}
          </DialogTitle>
          <DialogDescription>{fmtDate(game.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {game.homeAway}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.team.abbr}</p>
              <p className="font-display text-5xl font-black text-sport tabular">{sf}</p>
            </div>
            <span className={cn('rounded-md px-2 py-1 text-sm font-bold', res === 'W' ? 'bg-good/15 text-good' : res === 'L' ? 'bg-bad/15 text-bad' : 'bg-muted')}>{res}</span>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">OPP</p>
              {editing ? (
                <Input aria-label="Opponent score" type="number" className="w-20 text-xl font-bold" value={against} onChange={(e) => setAgainst(e.target.value)} />
              ) : (
                <p className="font-display text-5xl font-black tabular">{game.scoreAgainst}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-box">
                <Pencil /> Edit stats
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-bad"
              data-testid="button-delete-game"
              onClick={() => {
                if (!window.confirm(`Delete the game vs ${game.opponent}? Player stats from this game will be removed.`)) return;
                update((st) => deleteGame(st, game.id));
                toast({ title: 'Game deleted' });
                onOpenChange(false);
              }}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
        {game.teamStats && <p className="rounded-lg border border-sport/40 bg-sport/5 p-3 text-sm">This game uses manual team totals, which can differ from the player box score below. Edit or remove the team override in Stats → Enter / edit stats. Player edits here will not overwrite the recorded team totals.</p>}
        <BoxScoreGrid cfg={cfg} players={players} lines={lines} editable={editing} onChange={set} />
        {editing && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLines(boxFor(s, game.id));
                setAgainst(String(game.scoreAgainst));
                setEditing(false);
              }}
            >
              Discard
            </Button>
            <Button
              data-testid="button-save-box"
              onClick={() => {
                const sa = Math.max(0, Number(against) || 0);
                update((st) => updateGame(cfg, st, game.id, lines, { scoreAgainst: sa }));
                toast({ title: 'Box score updated', description: 'Season stats, scores and charts recalculated.' });
                setEditing(false);
              }}
            >
              Save box score
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
