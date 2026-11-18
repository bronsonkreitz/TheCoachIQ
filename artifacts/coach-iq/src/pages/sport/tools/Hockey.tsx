import { useState, type MouseEvent } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSport, useTool } from '@/store/sport-context';
import { Button } from '@/components/ui/button';
import { NativeSelect, Seg, chartTheme } from '@/components/coach/ui';
import { fmtDate } from '@/lib/format';
import { uid } from '@/lib/rng';
import { byScore, PlayerPick } from './shared';

const FWD = [1, 2, 3, 4].flatMap((n) => ['LW', 'C', 'RW'].map((p) => ({ id: `F${n}${p}`, group: `Line ${n}`, label: p, pos: p })));
const DEF = [1, 2, 3].flatMap((n) => ['LD', 'RD'].map((p) => ({ id: `D${n}${p}`, group: `Pair ${n}`, label: p, pos: 'D' })));
const GOAL = [{ id: 'G1', group: 'Goalies', label: 'Starter', pos: 'G' }, { id: 'G2', group: 'Goalies', label: 'Backup', pos: 'G' }];
const PP = ['PP1-1', 'PP1-2', 'PP1-3', 'PP1-4', 'PP1-5'].map((id, i) => ({ id, group: 'Power play', label: i === 4 ? 'D' : 'F', pos: '*' }));
const PK = ['PK1-1', 'PK1-2', 'PK1-3', 'PK1-4'].map((id, i) => ({ id, group: 'Penalty kill', label: i < 2 ? 'F' : 'D', pos: '*' }));
const ALL = [...FWD, ...DEF, ...GOAL, ...PP, ...PK];

export function Lines() {
  const { roster, scores } = useSport();
  const [a, setA] = useTool<Record<string, string>>('hockey.lines', {});
  const avail = roster.filter((p) => p.status !== 'Injured');
  const eligible = (pos: string) => (pos === '*' ? avail.filter((p) => p.position !== 'G') : avail.filter((p) => (pos === 'C' || pos === 'LW' || pos === 'RW' ? ['C', 'LW', 'RW'].includes(p.position) : p.position === pos)));
  const auto = () => {
    const out: Record<string, string> = {};
    const used = new Set<string>();
    for (const s of [...FWD, ...DEF, ...GOAL]) {
      const pool = byScore(avail.filter((p) => !used.has(p.id)), scores);
      const pick = pool.find((p) => p.position === s.pos) ?? pool.find((p) => eligible(s.pos).includes(p));
      if (pick) { out[s.id] = pick.id; used.add(pick.id); }
    }
    const fw = byScore(avail.filter((p) => ['C', 'LW', 'RW'].includes(p.position)), scores);
    const d = byScore(avail.filter((p) => p.position === 'D'), scores);
    const pts = (id: string) => (scores[id]?.stats.p ?? scores[id]?.stats.pts ?? 0);
    const ppF = [...fw].sort((x, y) => pts(y.id) - pts(x.id));
    ['PP1-1', 'PP1-2', 'PP1-3', 'PP1-4'].forEach((k, i) => ppF[i] && (out[k] = ppF[i].id));
    if (d[0]) out['PP1-5'] = d[0].id;
    const pkF = [...fw].sort((x, y) => (scores[y.id]?.stats.pm ?? 0) - (scores[x.id]?.stats.pm ?? 0));
    if (pkF[0]) out['PK1-1'] = pkF[0].id;
    if (pkF[1]) out['PK1-2'] = pkF[1].id;
    if (d[1]) out['PK1-3'] = d[1].id;
    if (d[2]) out['PK1-4'] = d[2].id;
    setA(out);
  };
  const groups = Array.from(new Set(ALL.map((s) => s.group)));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Four forward lines, three D pairs, goalies, plus PP and PK units. Injured players are excluded.</p>
        <div className="flex gap-2"><Button size="sm" onClick={auto}>Auto fill</Button><Button size="sm" variant="outline" onClick={() => setA({})}>Clear</Button></div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <div key={g} className="rounded-xl border border-border p-3">
            <p className="mb-2 font-display font-bold uppercase text-sport">{g}</p>
            <div className="space-y-1.5">
              {ALL.filter((s) => s.group === g).map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-14 text-xs font-semibold text-muted-foreground">{s.label}</span>
                  <PlayerPick label={`${g} ${s.label}`} value={a[s.id]} onChange={(v) => setA({ ...a, [s.id]: v })} players={eligible(s.pos)} scores={scores} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Shot { id: string; gameId: string; x: number; y: number; result: 'Goal' | 'Save' | 'Miss'; playerId: string }
const COLORS = { Goal: 'hsl(146 72% 50%)', Save: 'hsl(40 98% 56%)', Miss: 'hsl(218 22% 62%)' };

export function ShotMap() {
  const { s, roster } = useSport();
  const games = [...s.games].sort((a, b) => b.date.localeCompare(a.date));
  const [shots, setShots] = useTool<Shot[]>('hockey.shots', []);
  const [gameId, setGameId] = useState(games[0]?.id ?? '');
  const [result, setResult] = useState<Shot['result']>('Save');
  const [pid, setPid] = useState('');
  const mine = shots.filter((x) => gameId === 'all' || x.gameId === gameId);
  const click = (e: MouseEvent<SVGSVGElement>) => {
    if (gameId === 'all') return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 200;
    const y = ((e.clientY - r.top) / r.height) * 85;
    setShots([...shots, { id: uid('sh'), gameId, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, result, playerId: pid }]);
  };
  const count = (k: Shot['result']) => mine.filter((x) => x.result === k).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Game" value={gameId} onChange={(e) => setGameId(e.target.value)}>
          <option value="all">All games (view only)</option>
          {games.map((g) => <option key={g.id} value={g.id}>{fmtDate(g.date)} vs {g.opponent}</option>)}
        </NativeSelect>
        <Seg label="Shot result" size="sm" value={result} onChange={(v) => setResult(v as Shot['result'])} options={(['Goal', 'Save', 'Miss'] as const).map((v) => ({ value: v, label: v }))} />
        <div className="w-56"><PlayerPick label="Shooter" value={pid} onChange={setPid} players={roster.filter((p) => p.position !== 'G')} /></div>
        <Button size="sm" variant="outline" disabled={!mine.length || gameId === 'all'} onClick={() => setShots(shots.slice(0, shots.map((x) => x.gameId).lastIndexOf(gameId)).concat(shots.slice(shots.map((x) => x.gameId).lastIndexOf(gameId) + 1)))}>Undo last</Button>
      </div>
      <p className="text-sm text-muted-foreground">Click the rink to log a shot. {mine.length} shots · {count('Goal')} goals · {count('Save')} saved · {count('Miss')} missed{mine.length ? ` · shooting ${((count('Goal') / Math.max(1, count('Goal') + count('Save'))) * 100).toFixed(1)}% on target` : ''}</p>
      <svg viewBox="0 0 200 85" onClick={click} className="w-full cursor-crosshair rounded-[2rem] border-2 border-foreground/40 bg-sky-50/[0.06]" role="img" aria-label="Interactive rink shot map">
        <line x1="100" y1="0" x2="100" y2="85" stroke="hsl(354 86% 62%)" strokeWidth="1" />
        <line x1="75" y1="0" x2="75" y2="85" stroke="hsl(210 90% 60%)" strokeWidth="1" />
        <line x1="125" y1="0" x2="125" y2="85" stroke="hsl(210 90% 60%)" strokeWidth="1" />
        <line x1="11" y1="0" x2="11" y2="85" stroke="hsl(354 86% 62%)" strokeWidth="0.5" />
        <line x1="189" y1="0" x2="189" y2="85" stroke="hsl(354 86% 62%)" strokeWidth="0.5" />
        <circle cx="100" cy="42.5" r="15" fill="none" stroke="hsl(210 90% 60%)" strokeWidth="0.5" />
        {[[31, 20.5], [31, 64.5], [169, 20.5], [169, 64.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="15" fill="none" stroke="hsl(354 86% 62% / 0.6)" strokeWidth="0.5" />)}
        <path d="M189 38.5 a4 4 0 0 1 0 8" fill="hsl(210 90% 60% / 0.3)" stroke="hsl(210 90% 60%)" strokeWidth="0.4" />
        <path d="M11 38.5 a4 4 0 0 0 0 8" fill="hsl(210 90% 60% / 0.3)" stroke="hsl(210 90% 60%)" strokeWidth="0.4" />
        {mine.map((x) => (
          <g key={x.id}>
            {x.result === 'Goal' ? <circle cx={x.x} cy={x.y} r="2.4" fill={COLORS.Goal} stroke="hsl(var(--background))" strokeWidth="0.5" /> : x.result === 'Save' ? <circle cx={x.x} cy={x.y} r="2" fill="none" stroke={COLORS.Save} strokeWidth="0.9" /> : <path d={`M${x.x - 1.6} ${x.y - 1.6} l3.2 3.2 m0 -3.2 l-3.2 3.2`} stroke={COLORS.Miss} strokeWidth="0.8" />}
            <title>{x.result}{x.playerId ? ` · ${roster.find((p) => p.id === x.playerId)?.name ?? ''}` : ''}</title>
          </g>
        ))}
      </svg>
      <div className="flex gap-4 text-xs text-muted-foreground"><span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: COLORS.Goal }} />Goal</span><span><span className="mr-1 inline-block h-2 w-2 rounded-full border" style={{ borderColor: COLORS.Save }} />Save</span><span style={{ color: COLORS.Miss }}>x Miss</span></div>
    </div>
  );
}

export function IceTime() {
  const { cfg, s, roster } = useSport();
  const games = [...s.games].sort((a, b) => b.date.localeCompare(a.date));
  const [gameId, setGameId] = useState(games[0]?.id ?? '');
  const data = roster
    .map((p) => {
      const l = p.gameStats.find((x) => x.gameId === gameId);
      const toi = l ? (p.position === 'G' ? l.s.gtoi ?? 0 : l.s.toi ?? 0) : 0;
      const all = p.gameStats.map((x) => (p.position === 'G' ? x.s.gtoi ?? 0 : x.s.toi ?? 0));
      const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
      return { name: p.name.split(' ').slice(-1)[0], full: `${p.name} (${p.position})`, This: Math.round(toi * 10) / 10, Avg: Math.round(avg * 10) / 10 };
    })
    .filter((d) => d.This > 0 || d.Avg > 0)
    .sort((a, b) => b.This - a.This);
  return (
    <div className="space-y-3">
      <NativeSelect aria-label="Game" value={gameId} onChange={(e) => setGameId(e.target.value)}>
        {games.map((g) => <option key={g.id} value={g.id}>{fmtDate(g.date)} vs {g.opponent} ({g.scoreFor}-{g.scoreAgainst})</option>)}
      </NativeSelect>
      <p className="text-xs text-muted-foreground">Minutes on ice this game vs season average, from box scores. Edit a game's TOI in the Games tab.</p>
      <div className="h-80" role="img" aria-label="Ice time per player for the selected game">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -14, right: 4, top: 8 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={10} interval={0} angle={-35} textAnchor="end" height={50} />
            <YAxis stroke={chartTheme.axis} fontSize={11} />
            <Tooltip {...chartTheme.tooltip} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''} />
            <Bar dataKey="This" name="This game" fill={cfg.hex} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Avg" name="Season avg" fill="hsl(218 22% 62% / 0.5)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
