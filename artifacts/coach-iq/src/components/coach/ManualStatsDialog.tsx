import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoxScoreGrid } from './GameDialogs';
import { Field, NativeSelect, Seg } from './ui';
import { useSport } from '@/store/sport-context';
import { addGame, boxFor, hasData, updateGame } from '@/store/actions';
import { gameTeamStats, sumRaw } from '@/lib/analytics';
import { TEAM_FIELDS, statEntryError } from '@/lib/manual-stats';
import { fmtDate } from '@/lib/format';
import { uid } from '@/lib/rng';
import { useToast } from '@/hooks/use-toast';
import type { Raw } from '@/lib/types';

/** Draft-only editing: no stored values change until the explicit Save action. */
export function ManualStatsDialog({ onClose, initialView, initialPlayerId }: {
  onClose: () => void; initialView: 'team' | 'player'; initialPlayerId?: string;
}) {
  const { cfg, s, roster, update } = useSport();
  const { toast } = useToast();
  const orderedGames = [...s.games].sort((a, b) => b.date.localeCompare(a.date));
  const [gameId, setGameId] = useState(orderedGames[0]?.id ?? 'new');
  const game = s.games.find((g) => g.id === gameId);
  const [scope, setScope] = useState<'team' | 'player'>(initialView);
  const [playerId, setPlayerId] = useState(initialView === 'player' ? initialPlayerId ?? 'all' : 'all');
  const [lines, setLines] = useState<Record<string, Raw>>(() => game ? boxFor(s, game.id) : {});
  const [teamDraft, setTeamDraft] = useState<Raw>(() => game ? gameTeamStats(s, game) : {});
  const [keepManual, setKeepManual] = useState(!!game?.teamStats);
  const [extra, setExtra] = useState<Raw>(() => ({ ...(game?.extra ?? (cfg.id === 'soccer' ? { poss: 50 } : {})) }));
  const [date, setDate] = useState(game?.date ?? new Date().toISOString().slice(0, 10));
  const [opponent, setOpponent] = useState(game?.opponent ?? '');
  const [venue, setVenue] = useState<'Home' | 'Away'>(game?.homeAway ?? 'Home');
  const [against, setAgainst] = useState(String(game?.scoreAgainst ?? 0));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const normalizedTeam = cfg.normalize ? cfg.normalize(teamDraft) : teamDraft;
  const teamOverride = scope === 'team' ? normalizedTeam : keepManual ? game?.teamStats : undefined;
  const score = cfg.teamScore(teamOverride ? [teamOverride] : Object.values(lines));
  const close = () => {
    if (!dirty || window.confirm('Discard your unsaved stat changes?')) onClose();
  };
  const chooseGame = (id: string) => {
    if (dirty && !window.confirm('Discard your unsaved changes and switch games?')) return;
    const next = s.games.find((g) => g.id === id);
    setGameId(id);
    setLines(next ? boxFor(s, next.id) : {});
    setTeamDraft(next ? gameTeamStats(s, next) : {});
    setKeepManual(!!next?.teamStats);
    setExtra({ ...(next?.extra ?? (cfg.id === 'soccer' ? { poss: 50 } : {})) });
    setDate(next?.date ?? new Date().toISOString().slice(0, 10));
    setOpponent(next?.opponent ?? '');
    setVenue(next?.homeAway ?? 'Home');
    setAgainst(String(next?.scoreAgainst ?? 0));
    setDirty(false);
    setError('');
  };
  const changeLine = (id: string, key: string, value: number) => {
    setLines((old) => {
      const raw = { ...old[id], [key]: value };
      return { ...old, [id]: cfg.normalize ? cfg.normalize(raw) : raw };
    });
    setDirty(true);
  };
  const save = () => {
    if (!opponent.trim()) return setError('Enter an opponent name.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00`))) return setError('Enter a valid game date.');
    const sa = Number(against);
    if (against.trim() === '' || !Number.isInteger(sa) || sa < 0) return setError('Opponent score must be a non-negative whole number.');
    if (scope === 'team') {
      const err = statEntryError(cfg, normalizedTeam);
      if (err) return setError(err);
    } else {
      for (const [id, raw] of Object.entries(lines)) {
        const err = statEntryError(cfg, raw);
        if (err) return setError(`${s.players.find((p) => p.id === id)?.name ?? 'Player'}: ${err}`);
      }
      if (!game && !Object.values(lines).some(hasData)) return setError('Enter at least one player’s stats, or choose Team totals to record a team-only result.');
    }
    for (const field of TEAM_FIELDS[cfg.id]) {
      const v = extra[field.key] ?? 0;
      if (!Number.isFinite(v) || v < 0 || (field.max !== undefined && v > field.max)) return setError(`${field.label} must be between 0 and ${field.max ?? 'a valid positive number'}.`);
    }
    if (!cfg.allowDraws && score === sa) return setError(`${cfg.name} games cannot end tied. Adjust the score or scoring stats.`);
    const patch = { date, opponent: opponent.trim(), homeAway: venue, scoreAgainst: sa, extra, teamStats: teamOverride };
    if (game) {
      update((st) => updateGame(cfg, st, game.id, scope === 'player' ? lines : boxFor(st, game.id), patch));
    } else {
      const id = uid(`${cfg.id}-manual`);
      update((st) => addGame(cfg, st, { ...patch, id, teamId: st.team.id }, scope === 'player' ? lines : {}));
    }
    toast({ title: 'Manual stats updated', description: 'Stats, team charts and recommendations have been updated. Check the browser save status for persistence.' });
    onClose();
  };
  const players = s.players.filter((p) => (!p.removed || !!lines[p.id]) && (playerId === 'all' || p.id === playerId));
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[94dvh] grid-cols-1 overflow-y-auto [&>*]:min-w-0 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">Enter / edit stats</DialogTitle>
          <DialogDescription>Add your own stats for a new game or correct an existing game. No simulation is required.</DialogDescription>
        </DialogHeader>
        <Field label="Game to enter or edit" htmlFor="manual-game">
          <NativeSelect id="manual-game" value={gameId} onChange={(e) => chooseGame(e.target.value)} className="w-full">
            <option value="new">+ New game — start with blank stats</option>
            {orderedGames.map((g) => <option key={g.id} value={g.id}>{fmtDate(g.date)} vs {g.opponent}{g.teamStats ? ' · Manual team totals' : ''}</option>)}
          </NativeSelect>
        </Field>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Game date" htmlFor="manual-date"><Input id="manual-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setDirty(true); }} /></Field>
          <Field label="Opponent" htmlFor="manual-opponent" className="sm:col-span-2"><Input id="manual-opponent" value={opponent} onChange={(e) => { setOpponent(e.target.value); setDirty(true); }} /></Field>
          <Field label="Venue" htmlFor="manual-venue"><NativeSelect id="manual-venue" value={venue} onChange={(e) => { setVenue(e.target.value as 'Home' | 'Away'); setDirty(true); }} className="w-full"><option>Home</option><option>Away</option></NativeSelect></Field>
        </div>
        <Seg label="Stats entry type" value={scope} onChange={(v) => { setScope(v as 'team' | 'player'); setError(''); }} options={[{ value: 'player', label: 'Individual players' }, { value: 'team', label: 'Team totals' }]} />
        {scope === 'player' ? (
          <div className="min-w-0 space-y-3">
            <Field label="Player to edit" htmlFor="manual-player">
              <NativeSelect id="manual-player" value={playerId} onChange={(e) => setPlayerId(e.target.value)} className="w-full">
                <option value="all">All players</option>
                {s.players.filter((p) => !p.removed || lines[p.id]).map((p) => <option key={p.id} value={p.id}>{p.name}{p.removed ? ' (removed)' : ''}</option>)}
              </NativeSelect>
            </Field>
            <p className="text-sm text-muted-foreground">Enter game totals, not season averages. Percentages and averages calculate automatically from your entries. Editing one player leaves all other players unchanged.</p>
            {game?.teamStats && <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm"><input type="checkbox" checked={keepManual} onChange={(e) => { setKeepManual(e.target.checked); setDirty(true); }} />Keep this game’s manual team totals. Uncheck to recalculate team totals from the player box scores.</label>}
            <BoxScoreGrid cfg={cfg} players={players} lines={lines} editable onChange={changeLine} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg border border-sport/40 bg-sport/5 p-3 text-sm">Manual team totals replace the player-summed totals for this game’s team charts, score and practice recommendations. They do not change individual player records or player rankings.</p>
            <Button size="sm" variant="outline" onClick={() => { setTeamDraft(sumRaw(Object.values(lines))); setDirty(true); }}>Copy totals from players</Button>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {cfg.rawKeys.map((f) => <Field key={f.key} label={f.label + (f.calc ? ' (calculated)' : '')} htmlFor={`manual-team-${f.key}`}><Input id={`manual-team-${f.key}`} type="number" step="any" disabled={f.calc} value={normalizedTeam[f.key] ?? 0} onChange={(e) => { setTeamDraft((old) => ({ ...old, [f.key]: Number(e.target.value) || 0 })); setDirty(true); }} /></Field>)}
            </div>
            <p className="text-xs text-muted-foreground">Enter counts and attempts, not percentages. Use OUTS for baseball innings (3 outs = 1 inning). TOI and MIN are minutes.</p>
          </div>
        )}
        <div className="grid gap-3 rounded-xl border border-border bg-surface/60 p-4 sm:grid-cols-3">
          <div><p className="text-sm text-muted-foreground">Team {cfg.scoreUnit.toLowerCase()} (calculated)</p><p className="font-display text-3xl font-bold text-sport" data-testid="manual-team-score">{score}</p></div>
          <Field label="Opponent score" htmlFor="manual-against"><Input id="manual-against" type="number" min={0} step={1} value={against} onChange={(e) => { setAgainst(e.target.value); setDirty(true); }} /></Field>
          {TEAM_FIELDS[cfg.id].map((f) => <Field key={f.key} label={f.label} htmlFor={`manual-extra-${f.key}`}><Input id={`manual-extra-${f.key}`} type="number" min={0} max={f.max} step="any" value={extra[f.key] ?? 0} onChange={(e) => { setExtra((old) => ({ ...old, [f.key]: Number(e.target.value) || 0 })); setDirty(true); }} /></Field>)}
        </div>
        {error && <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{error}</p>}
        <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={save} data-testid="button-save-manual-stats">Save stats</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
