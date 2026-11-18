import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useSport, useTool } from '@/store/sport-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, Seg } from '@/components/coach/ui';
import { fmtDate } from '@/lib/format';
import { uid } from '@/lib/rng';
import { cn } from '@/lib/utils';
import { byScore, PlayerPick } from './shared';

export function DepthChart() {
  const { cfg, roster, scores } = useSport();
  const [depth, setDepth] = useTool<Record<string, string[]>>('football.depth', {});
  const get = (pos: string) => {
    const ranked = byScore(roster.filter((p) => p.position === pos), scores).map((p) => p.id);
    const saved = (depth[pos] ?? []).filter((id) => ranked.includes(id));
    return [0, 1, 2].map((i) => saved[i] ?? ranked.filter((r) => !saved.includes(r))[i - saved.length] ?? '');
  };
  const set = (pos: string, i: number, id: string) => {
    const cur = get(pos);
    const j = cur.indexOf(id);
    if (j >= 0) cur[j] = cur[i];
    cur[i] = id;
    setDepth({ ...depth, [pos]: cur });
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Defaults to performance score order. Changes save automatically.</p>
        <Button size="sm" variant="outline" onClick={() => setDepth({})}>Reset to score order</Button>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-[11px] uppercase text-muted-foreground"><tr><th className="py-2 text-left">Pos</th><th>1st string</th><th>2nd string</th><th>3rd string</th></tr></thead>
          <tbody>
            {cfg.positions.map((pos) => {
              const players = roster.filter((p) => p.position === pos);
              const cur = get(pos);
              return (
                <tr key={pos} className="border-t border-border/60">
                  <td className="py-1.5 font-display font-bold text-sport">{pos}</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="px-1 py-1"><PlayerPick label={`${pos} string ${i + 1}`} value={cur[i]} onChange={(v) => set(pos, i, v)} players={players} scores={scores} /></td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type PlayType = 'Run' | 'Pass' | 'Screen' | 'Blitz';
interface Play { id: string; name: string; type: PlayType; formation: string; calls: number; success: number }
const SEED: Play[] = [
  ['Inside Zone', 'Run', 'Singleback', 34, 19], ['Power O', 'Run', 'I-Form', 21, 11], ['Counter Trey', 'Run', 'Pistol', 15, 9], ['Outside Stretch', 'Run', 'Shotgun', 18, 7], ['QB Draw', 'Run', 'Empty', 9, 5],
  ['Four Verticals', 'Pass', 'Shotgun 2x2', 16, 6], ['Mesh', 'Pass', 'Shotgun 3x1', 22, 14], ['Smash', 'Pass', 'Trips', 14, 8], ['Y-Cross', 'Pass', 'Shotgun', 12, 7], ['PA Boot', 'Pass', 'Under center', 11, 7],
  ['RB Slip Screen', 'Screen', 'Shotgun', 10, 6], ['WR Bubble', 'Screen', 'Trips', 19, 12], ['TE Middle Screen', 'Screen', 'Ace', 7, 3],
  ['Cover 0 Blitz', 'Blitz', 'Nickel', 13, 6], ['Fire Zone 3', 'Blitz', 'Base 4-3', 17, 10], ['Double A-Gap', 'Blitz', 'Nickel', 11, 5], ['Corner Cat', 'Blitz', 'Dime', 8, 4],
].map(([name, type, formation, calls, success], i) => ({ id: `pl${i}`, name: name as string, type: type as PlayType, formation: formation as string, calls: calls as number, success: success as number }));

export function Playbook() {
  const [plays, setPlays] = useTool<Play[]>('football.plays', SEED);
  const [type, setType] = useState<'All' | PlayType>('All');
  const [name, setName] = useState('');
  const [nt, setNt] = useState<PlayType>('Run');
  const upd = (id: string, patch: Partial<Play>) => setPlays(plays.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const shown = plays.filter((p) => type === 'All' || p.type === type).sort((a, b) => b.success / Math.max(1, b.calls) - a.success / Math.max(1, a.calls));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Seg label="Play type" size="sm" value={type} onChange={(v) => setType(v as typeof type)} options={(['All', 'Run', 'Pass', 'Screen', 'Blitz'] as const).map((v) => ({ value: v, label: v }))} />
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; setPlays([...plays, { id: uid('pl'), name: name.trim(), type: nt, formation: 'Custom', calls: 0, success: 0 }]); setName(''); }}>
          <Input aria-label="New play name" placeholder="New play" value={name} onChange={(e) => setName(e.target.value)} className="w-36" />
          <NativeSelect aria-label="New play type" value={nt} onChange={(e) => setNt(e.target.value as PlayType)}>{['Run', 'Pass', 'Screen', 'Blitz'].map((t) => <option key={t}>{t}</option>)}</NativeSelect>
          <Button type="submit" size="sm"><Plus /> Add</Button>
        </form>
      </div>
      <p className="text-xs text-muted-foreground">{plays.length} plays. Edit calls and successes after each game; success rate updates instantly.</p>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="text-[11px] uppercase text-muted-foreground"><tr><th className="py-2 text-left">Play</th><th className="text-left">Type</th><th className="text-left">Formation</th><th>Calls</th><th>Successes</th><th className="text-right">Rate</th><th /></tr></thead>
          <tbody>
            {shown.map((p) => {
              const r = p.calls ? p.success / p.calls : 0;
              return (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-1.5 font-medium">{p.name}</td>
                  <td><span className="rounded bg-muted px-1.5 text-xs">{p.type}</span></td>
                  <td className="text-xs text-muted-foreground">{p.formation}</td>
                  <td className="text-center"><input type="number" min={0} aria-label={`${p.name} calls`} value={p.calls} onChange={(e) => upd(p.id, { calls: Math.max(0, Number(e.target.value) || 0), success: Math.min(p.success, Math.max(0, Number(e.target.value) || 0)) })} className="h-7 w-16 rounded-md border border-input bg-background/70 text-center" /></td>
                  <td className="text-center"><input type="number" min={0} aria-label={`${p.name} successes`} value={p.success} onChange={(e) => upd(p.id, { success: Math.min(p.calls, Math.max(0, Number(e.target.value) || 0)) })} className="h-7 w-16 rounded-md border border-input bg-background/70 text-center" /></td>
                  <td className={cn('text-right font-semibold tabular', r >= 0.55 ? 'text-good' : r < 0.4 ? 'text-bad' : '')}>{(r * 100).toFixed(1)}%</td>
                  <td className="text-right"><button aria-label={`Delete ${p.name}`} onClick={() => setPlays(plays.filter((x) => x.id !== p.id))} className="p-1 text-muted-foreground hover:text-bad"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FilmNote { id: string; gameId: string; ts: string; tag: string; playerId: string; note: string; createdAt: string }

export function FilmNotes() {
  const { s, roster } = useSport();
  const games = [...s.games].sort((a, b) => b.date.localeCompare(a.date));
  const [notes, setNotes] = useTool<FilmNote[]>('football.film', []);
  const [gameId, setGameId] = useState(games[0]?.id ?? '');
  const [ts, setTs] = useState('');
  const [tag, setTag] = useState('Offense');
  const [pid, setPid] = useState('');
  const [text, setText] = useState('');
  const valid = /^\d{1,2}:\d{2}$/.test(ts) && text.trim().length > 0;
  const list = notes.filter((n) => n.gameId === gameId).sort((a, b) => a.ts.padStart(5, '0').localeCompare(b.ts.padStart(5, '0')));
  return (
    <div className="space-y-3">
      <NativeSelect aria-label="Game" value={gameId} onChange={(e) => setGameId(e.target.value)}>
        {games.map((g) => <option key={g.id} value={g.id}>{fmtDate(g.date)} vs {g.opponent} ({g.scoreFor}-{g.scoreAgainst})</option>)}
      </NativeSelect>
      <form className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[6rem_8rem_1fr]" onSubmit={(e) => { e.preventDefault(); if (!valid) return; setNotes([...notes, { id: uid('fn'), gameId, ts, tag, playerId: pid, note: text.trim(), createdAt: new Date().toISOString() }]); setText(''); setTs(''); }}>
        <Input aria-label="Timestamp mm:ss" placeholder="mm:ss" value={ts} onChange={(e) => setTs(e.target.value)} />
        <NativeSelect aria-label="Unit" value={tag} onChange={(e) => setTag(e.target.value)}>{['Offense', 'Defense', 'Special teams'].map((t) => <option key={t}>{t}</option>)}</NativeSelect>
        <PlayerPick label="Player (optional)" value={pid} onChange={setPid} players={roster} />
        <Input aria-label="Note" placeholder="What happened on this snap?" value={text} onChange={(e) => setText(e.target.value)} className="sm:col-span-2" />
        <Button type="submit" disabled={!valid}>Add note</Button>
      </form>
      {!list.length ? <p className="text-sm text-muted-foreground">No film notes for this game yet.</p> : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-xl border border-border p-3">
              <span className="font-mono text-sm font-bold text-sport">{n.ts}</span>
              <div className="flex-1">
                <p className="text-sm">{n.note}</p>
                <p className="text-xs text-muted-foreground">{n.tag}{n.playerId ? ` · ${roster.find((p) => p.id === n.playerId)?.name ?? ''}` : ''}</p>
              </div>
              <button aria-label="Delete note" onClick={() => setNotes(notes.filter((x) => x.id !== n.id))} className="p-1 text-muted-foreground hover:text-bad"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
