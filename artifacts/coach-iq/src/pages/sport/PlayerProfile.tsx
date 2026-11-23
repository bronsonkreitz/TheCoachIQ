import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ArrowLeft, Check, Pencil, ThumbsDown, ThumbsUp, UserX } from 'lucide-react';
import { useSport } from '@/store/sport-context';
import { storageFeedback, useStore } from '@/store/store';
import { colLabel, colVal, gameOrder, linesFor, strengthsWeaknesses } from '@/lib/analytics';
import { fmt, fmtDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Empty, NativeSelect, Panel, PlayerAvatar, ScoreRing, StatusBadge, chartTheme } from '@/components/coach/ui';
import { PlayerFormDialog } from '@/components/coach/PlayerFormDialog';
import { upsertPlayer } from '@/store/actions';
import { useToast } from '@/hooks/use-toast';
import type { Status } from '@/lib/types';

export default function PlayerProfile({ playerId }: { playerId: string }) {
  const { storageStatus } = useStore();
  const { cfg, s, scores, roster, update } = useSport();
  const { toast } = useToast();
  const p = s.players.find((x) => x.id === playerId && !x.removed);
  const [edit, setEdit] = useState(false);
  const [notes, setNotes] = useState(p?.notes ?? '');
  useEffect(() => setNotes(p?.notes ?? ''), [p?.id, p?.notes]);
  const relevant = useMemo(() => {
    if (!p) return [];
    const w = cfg.weights(p.position);
    const keys = new Set([...Object.keys(w), ...cfg.rosterCols]);
    return cfg.columns.filter((c) => keys.has(c.key) && Number.isFinite(scores[p.id]?.stats[c.key]));
  }, [p, cfg, scores]);
  const [trendKey, setTrendKey] = useState<string>('');
  useEffect(() => setTrendKey(relevant[0]?.key ?? ''), [relevant]);

  if (!p)
    return (
      <Empty
        icon={<UserX className="h-5 w-5" />}
        title="Player not found"
        body="This player may have been removed from the roster."
        action={
          <Link href={`/${cfg.id}/roster`} className="text-sm font-semibold text-sport hover:underline">
            Back to roster
          </Link>
        }
      />
    );
  const sc = scores[p.id];
  const order = gameOrder(s.games);
  const lines = linesFor(p, undefined, order);
  const gameById = new Map(s.games.map((g) => [g.id, g]));
  const trendCol = cfg.columns.find((c) => c.key === trendKey);
  const trendData = lines.map((l) => {
    const st = cfg.derive(l.s, 1);
    return { name: fmtDate(gameById.get(l.gameId)?.date ?? ''), value: trendCol ? colVal(trendCol, st, 1, 'tot') : 0 };
  });
  const poolPlayers = roster.filter((x) => cfg.pool(x.position) === cfg.pool(p.position) && scores[x.id]?.gp);
  const radarCols = Object.keys(cfg.weights(p.position))
    .map((k) => cfg.columns.find((c) => c.key === k)!)
    .filter(Boolean)
    .slice(0, 7);
  const radar = radarCols.map((c) => {
    const vals = poolPlayers.map((x) => colVal(c, scores[x.id].stats, scores[x.id].gp, 'pg')).filter(Number.isFinite);
    const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    const mine = sc?.gp ? colVal(c, sc.stats, sc.gp, 'pg') : NaN;
    const max = Math.max(...vals, 1e-9);
    const min = Math.min(...vals);
    const norm = (v: number) => (Number.isFinite(v) ? (c.higher ? (v / max) * 100 : max === min ? 100 : ((max - v) / (max - min)) * 80 + 20) : 0);
    return { stat: c.label, Player: Math.round(norm(mine)), 'Team avg': Math.round(norm(avg)) };
  });
  const sw = strengthsWeaknesses(cfg, p, scores, s.players);
  const last5 = lines.slice(-5).reverse();
  const last5Keys = cfg.rawKeys.filter((k) => last5.some((l) => (l.s[k.key] ?? 0) !== 0));
  const setStatus = (st: Status) => {
    update((x) => upsertPlayer(x, { ...p, status: st }));
    toast({ title: `${p.name} marked ${st}`, description: 'Score, lineups and availability updated.' });
  };

  return (
    <div className="space-y-6">
      <Link href={`/${cfg.id}/roster`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-roster">
        <ArrowLeft className="h-4 w-4" /> Roster
      </Link>
      <div className="relative overflow-hidden rounded-3xl border border-card-border bg-card p-6">
        <span className="pointer-events-none absolute -right-4 -top-10 font-display text-[11rem] font-black leading-none text-sport/[0.07] tabular">{p.number}</span>
        <div className="relative flex flex-wrap items-center gap-6">
          <PlayerAvatar name={p.name} number={p.number} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">{cfg.positionNames[p.position]}</p>
            <h2 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl" data-testid="text-player-name">
              {p.name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={p.status} />
              <NativeSelect aria-label="Change status" value={p.status} onChange={(e) => setStatus(e.target.value as Status)} className="h-7 text-xs" data-testid="select-profile-status">
                <option>Active</option>
                <option>Questionable</option>
                <option>Injured</option>
              </NativeSelect>
              <Button size="sm" variant="outline" onClick={() => setEdit(true)} data-testid="button-edit-profile">
                <Pencil /> Edit bio
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreRing value={sc?.score ?? 0} size={88} />
            <div className="text-xs text-muted-foreground">
              <p>
                Season <span className="text-foreground tabular">{sc?.seasonScore.toFixed(1)}</span> x 60%
              </p>
              <p>
                Last 5 <span className="text-foreground tabular">{sc?.formScore.toFixed(1)}</span> x 40%
              </p>
              <p>
                Availability <span className="text-foreground tabular">x{sc?.avail}</span>
              </p>
            </div>
          </div>
        </div>
        <dl className="relative mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            ['Age', p.age],
            ['Height', p.height],
            ['Weight', `${p.weight} lb`],
            ['Year', p.year],
            ['Position', p.position],
            ['Jersey', `#${p.number}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-background/50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="font-semibold tabular">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Auto-generated" title={<span className="flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-good" /> Strengths</span>}>
          {sw.strengths.length ? (
            <ul className="space-y-2">
              {sw.strengths.map((x) => (
                <li key={x} className="flex gap-2 rounded-lg bg-good/[0.07] px-3 py-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No standout categories yet. Strengths appear when a weighted stat reaches the top 20% of similar roles.</p>
          )}
        </Panel>
        <Panel kicker="Auto-generated" title={<span className="flex items-center gap-2"><ThumbsDown className="h-5 w-5 text-bad" /> Weaknesses</span>}>
          {sw.weaknesses.length ? (
            <ul className="space-y-2">
              {sw.weaknesses.map((x) => (
                <li key={x} className="flex gap-2 rounded-lg bg-bad/[0.07] px-3 py-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bad" />
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">At or above team average in every weighted category.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          kicker="Game by game"
          title="Stat trend"
          actions={
            <NativeSelect aria-label="Trend stat" value={trendKey} onChange={(e) => setTrendKey(e.target.value)} data-testid="select-trend-stat">
              {relevant.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.desc}
                </option>
              ))}
            </NativeSelect>
          }
        >
          {trendData.length ? (
            <div className="h-64" role="img" aria-label={`Line chart of ${trendCol?.desc} by game`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ left: -14, right: 8, top: 8 }}>
                  <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                  <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                  <Tooltip {...chartTheme.tooltip} formatter={(v: number) => (trendCol ? fmt(v, trendCol.fmt) : v)} />
                  <Line type="monotone" dataKey="value" name={trendCol?.label} stroke={cfg.hex} strokeWidth={2.5} dot={{ r: 3, fill: cfg.hex }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No games played yet.</p>
          )}
        </Panel>
        <Panel kicker="Per game, normalized to team best" title="Skills vs team average">
          {radar.length >= 3 ? (
            <div className="h-64" role="img" aria-label="Radar chart comparing player skills with team average">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke={chartTheme.grid} />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: chartTheme.axis, fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Team avg" dataKey="Team avg" stroke="hsl(218 22% 62%)" fill="hsl(218 22% 62%)" fillOpacity={0.12} />
                  <Radar name={p.name} dataKey="Player" stroke={cfg.hex} fill={cfg.hex} fillOpacity={0.35} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip {...chartTheme.tooltip} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="space-y-2">
              {radar.map((r) => (
                <div key={r.stat} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{r.stat}</span>
                  <span className="tabular">
                    {r.Player} vs team {r['Team avg']}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel kicker={`${sc?.gp ?? 0} games played`} title="Season stats" bodyClass="p-0">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 text-left">Split</th>
                {relevant.map((c) => (
                  <th key={c.key} scope="col" className="px-3 py-2 text-right" title={c.desc}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['tot', 'pg'] as const).map((m) => (
                <tr key={m} className="border-t border-border/60">
                  <th scope="row" className="px-4 py-2 text-left font-medium">{m === 'tot' ? 'Season' : 'Per game'}</th>
                  {relevant.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-right tabular">
                      {sc ? fmt(colVal(c, sc.stats, sc.gp, m), c.count && m === 'pg' && c.fmt === 'int' ? 'd1' : c.fmt) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-border/60">
                <th scope="row" className="px-4 py-2 text-left font-medium text-sport">Team percentile</th>
                {relevant.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-right tabular text-sport">
                    {Number.isFinite(sc?.pcts[c.key]) ? sc!.pcts[c.key] : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sr-only">{relevant.map((c) => colLabel(c, 'pg')).join(', ')}</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel kicker="Most recent first" title="Last 5 games" bodyClass="p-0">
          {last5.length ? (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left">Game</th>
                    {last5Keys.map((k) => (
                      <th key={k.key} scope="col" className="px-2 py-2 text-right">
                        {k.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {last5.map((l) => {
                    const g = gameById.get(l.gameId);
                    return (
                      <tr key={l.gameId} className="border-t border-border/60">
                        <th scope="row" className="whitespace-nowrap px-4 py-2 text-left font-medium">
                          {g ? `${fmtDate(g.date)} ${g.homeAway === 'Home' ? 'vs' : '@'} ${g.opponent.split(' ').slice(-1)[0]}` : l.gameId}
                        </th>
                        {last5Keys.map((k) => (
                          <td key={k.key} className="px-2 py-2 text-right tabular">
                            {l.s[k.key] ?? 0}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">No game lines yet. Add a game result to start tracking.</p>
          )}
        </Panel>
        <Panel kicker="Browser-local notes" title="Coach notes">
          <label htmlFor="coach-notes" className="sr-only">
            Coach notes
          </label>
          <Textarea id="coach-notes" rows={7} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Practice observations, film cues, conversations..." data-testid="input-coach-notes" />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{notes === p.notes ? storageFeedback(storageStatus) : 'Unsaved changes'}</span>
            <Button
              size="sm"
              disabled={notes === p.notes}
              onClick={() => {
                update((x) => upsertPlayer(x, { ...p, notes }));
                toast({ title: 'Notes updated' });
              }}
              data-testid="button-save-notes"
            >
              Save notes
            </Button>
          </div>
        </Panel>
      </div>
      <PlayerFormDialog open={edit} onOpenChange={setEdit} player={p} />
    </div>
  );
}
