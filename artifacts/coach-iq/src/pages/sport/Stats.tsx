import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { ArrowDown, ArrowUp, Download, X } from 'lucide-react';
import { useSport } from '@/store/sport-context';
import { colFmt, colLabel, colVal, lastNIds, playerStats, sumRaw } from '@/lib/analytics';
import { downloadCsv, fmt, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChartFrame } from '@/components/coach/ChartFrame';
import { NativeSelect, Panel, Seg, chartTheme } from '@/components/coach/ui';

const PALETTE = ['hsl(74 100% 61%)', 'hsl(192 92% 68%)', 'hsl(280 70% 72%)', 'hsl(24 96% 58%)', 'hsl(146 72% 50%)', 'hsl(354 86% 62%)', 'hsl(40 98% 56%)', 'hsl(218 22% 62%)'];

export default function Stats() {
  const { cfg, s, scores, roster } = useSport();
  const [view, setView] = useState<'team' | 'player'>('team');
  const [mode, setMode] = useState<'pg' | 'tot'>(cfg.defaultMode);
  const [range, setRange] = useState<'5' | '10' | 'all'>('all');
  const ranked = useMemo(() => [...roster].sort((a, b) => (scores[b.id]?.score ?? 0) - (scores[a.id]?.score ?? 0)), [roster, scores]);
  const [playerId, setPlayerId] = useState(ranked[0]?.id ?? '');
  const [statKey, setStatKey] = useState(cfg.primary);
  const [xKey, setXKey] = useState(cfg.columns[0].key);
  const [yKey, setYKey] = useState(cfg.columns[Math.min(2, cfg.columns.length - 1)].key);
  const [compare, setCompare] = useState<string[]>(ranked.slice(0, 2).map((p) => p.id));
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: cfg.primary, dir: -1 });

  const filter = useMemo(() => lastNIds(s.games, range === 'all' ? null : Number(range)), [s.games, range]);
  const games = useMemo(() => [...s.games].filter((g) => filter.has(g.id)).sort((a, b) => a.date.localeCompare(b.date)), [s.games, filter]);
  const ps = useMemo(() => Object.fromEntries(roster.map((p) => [p.id, playerStats(cfg, p, filter)])), [roster, cfg, filter]);
  const col = cfg.columns.find((c) => c.key === statKey) ?? cfg.columns[0];
  const player = roster.find((p) => p.id === playerId) ?? ranked[0];
  const val = (id: string, key: string) => {
    const c = cfg.columns.find((x) => x.key === key)!;
    const st = ps[id];
    return st && st.gp ? colVal(c, st.stats, st.gp, mode) : NaN;
  };

  // 1. Line: trend per game
  const trend = games.map((g) => {
    const teamLines = s.players.flatMap((p) => p.gameStats.filter((l) => l.gameId === g.id).map((l) => l.s));
    const teamV = colVal(col, cfg.derive(sumRaw(teamLines), 1), 1, 'tot');
    const pl = player?.gameStats.find((l) => l.gameId === g.id);
    const pv = pl ? colVal(col, cfg.derive(pl.s, 1), 1, 'tot') : null;
    return { name: fmtDate(g.date), Team: Number.isFinite(teamV) ? teamV : null, [player?.name ?? 'Player']: pv != null && Number.isFinite(pv) ? pv : null };
  });
  // 2. Bar: player comparison
  const bars = roster
    .map((p) => ({ name: p.name.split(' ').slice(-1)[0], full: p.name, v: val(p.id, col.key) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((a, b) => (col.higher ? b.v - a.v : a.v - b.v))
    .slice(0, 12);
  // 3. Radar: skill profile (percentiles)
  const radarPlayers = view === 'player' && player ? [player.id, ...compare.filter((c) => c !== player.id)].slice(0, 3) : compare.slice(0, 3);
  const rpos = roster.find((p) => p.id === radarPlayers[0])?.position ?? cfg.positions[0];
  const radarCols = Object.keys(cfg.weights(rpos))
    .map((k) => cfg.columns.find((c) => c.key === k)!)
    .filter(Boolean);
  const radar = radarCols.map((c) => ({ stat: c.label, ...Object.fromEntries(radarPlayers.map((id) => [roster.find((p) => p.id === id)?.name ?? id, scores[id]?.pcts[c.key] ?? 0])) }));
  // 4. Scatter
  const xCol = cfg.columns.find((c) => c.key === xKey)!;
  const yCol = cfg.columns.find((c) => c.key === yKey)!;
  const scatter = roster.map((p) => ({ name: p.name, x: val(p.id, xKey), y: val(p.id, yKey), z: scores[p.id]?.score ?? 0 })).filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  // 5. Pie: share of team scoring
  const pie = roster
    .map((p) => ({ name: p.name, value: cfg.teamScore(p.gameStats.filter((l) => filter.has(l.gameId)).map((l) => l.s)) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const pieTop = [...pie.slice(0, 6), ...(pie.length > 6 ? [{ name: 'Rest of roster', value: pie.slice(6).reduce((a, b) => a + b.value, 0) }] : [])];

  // Table
  const tableCols = cfg.columns.filter((c) => roster.some((p) => Number.isFinite(val(p.id, c.key))));
  const tableRows = [...roster].sort((a, b) => {
    if (sort.key === 'name') return a.name.localeCompare(b.name) * sort.dir;
    if (sort.key === 'gp') return ((ps[a.id]?.gp ?? 0) - (ps[b.id]?.gp ?? 0)) * sort.dir;
    const va = val(a.id, sort.key);
    const vb = val(b.id, sort.key);
    return ((Number.isFinite(va) ? va : -1e9) - (Number.isFinite(vb) ? vb : -1e9)) * sort.dir;
  });
  const shownRows = view === 'player' && player ? tableRows.filter((p) => p.id === player.id) : tableRows;
  const exportCsv = () => {
    const header = ['Player', 'Number', 'Position', 'Status', 'GP', ...tableCols.map((c) => colLabel(c, mode))];
    const rows = shownRows.map((p) => [p.name, p.number, p.position, p.status, ps[p.id]?.gp ?? 0, ...tableCols.map((c) => fmt(val(p.id, c.key), colFmt(c, mode)))]);
    downloadCsv(`${cfg.id}-${view}-${mode === 'pg' ? 'per-game' : 'totals'}-${range === 'all' ? 'season' : `last${range}`}.csv`, [header, ...rows]);
  };

  const statSelect = (
    <NativeSelect aria-label="Stat" value={statKey} onChange={(e) => setStatKey(e.target.value)} className="h-8 text-xs" data-testid="select-stat">
      {cfg.columns.map((c) => (
        <option key={c.key} value={c.key}>
          {c.desc}
        </option>
      ))}
    </NativeSelect>
  );
  const pName = player?.name ?? 'Player';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">{games.length} games in range</p>
          <h2 className="font-display text-3xl font-black uppercase">Stats and graphs</h2>
        </div>
      </div>
      <div className="sticky top-16 z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/85 p-3 backdrop-blur-xl">
        <Seg label="View" value={view} onChange={(v) => setView(v as never)} options={[{ value: 'team', label: 'Team' }, { value: 'player', label: 'Player' }]} />
        <Seg label="Mode" value={mode} onChange={(v) => setMode(v as 'pg' | 'tot')} options={[{ value: 'tot', label: 'Season totals' }, { value: 'pg', label: 'Per game' }]} />
        <Seg label="Range" value={range} onChange={(v) => setRange(v as '5' | '10' | 'all')} options={[{ value: '5', label: 'Last 5' }, { value: '10', label: 'Last 10' }, { value: 'all', label: 'Season' }]} />
        {view === 'player' && (
          <NativeSelect aria-label="Player" value={player?.id} onChange={(e) => setPlayerId(e.target.value)} data-testid="select-stats-player">
            {ranked.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position})
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame
          kicker="Line · trend"
          title={`${col.desc} by game`}
          actions={statSelect}
          ariaLabel={`Line chart of ${col.desc} per game`}
          table={{ headers: ['Game', 'Team', pName], rows: trend.map((t) => [t.name, fmt(t.Team as number, col.fmt), fmt((t[pName] as number) ?? NaN, col.fmt)]) }}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                <Tooltip {...chartTheme.tooltip} formatter={(v: number) => fmt(v, col.fmt)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {view === 'team' || col.fmt === 'pct' || col.fmt === 'avg' ? <Line type="monotone" dataKey="Team" stroke={cfg.hex} strokeWidth={2.5} dot={{ r: 3 }} /> : null}
                {view === 'player' && <Line type="monotone" dataKey={pName} stroke="hsl(74 100% 61%)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
              </LineChart>
            </ResponsiveContainer>
          }
        />
        <ChartFrame
          kicker="Bar · comparison"
          title={`${colLabel(col, mode)} leaders`}
          actions={statSelect}
          ariaLabel={`Bar chart of ${col.desc} by player`}
          table={{ headers: ['Player', colLabel(col, mode)], rows: bars.map((b) => [b.full, fmt(b.v, colFmt(col, mode))]) }}
          chart={
            bars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={10} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                  <Tooltip {...chartTheme.tooltip} cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }} formatter={(v: number) => fmt(v, colFmt(col, mode))} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''} />
                  <Bar dataKey="v" name={colLabel(col, mode)} radius={[6, 6, 0, 0]}>
                    {bars.map((b) => (
                      <Cell key={b.full} fill={b.full === player?.name && view === 'player' ? 'hsl(74 100% 61%)' : cfg.hex} fillOpacity={b.full === player?.name || view === 'team' ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">No values for this stat in range.</p>
            )
          }
        />
        <ChartFrame
          kicker="Radar · skill profile"
          title="Percentile profile"
          ariaLabel="Radar chart of team percentiles for the selected players"
          table={{ headers: ['Stat', ...radarPlayers.map((id) => roster.find((p) => p.id === id)?.name ?? id)], rows: radar.map((r) => [r.stat, ...radarPlayers.map((id) => (r as Record<string, string | number>)[roster.find((p) => p.id === id)?.name ?? id])]) }}
          chart={
            radar.length >= 3 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke={chartTheme.grid} />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: chartTheme.axis, fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {radarPlayers.map((id, i) => {
                    const n = roster.find((p) => p.id === id)?.name ?? id;
                    return <Radar key={id} name={n} dataKey={n} stroke={i === 0 ? cfg.hex : PALETTE[i]} fill={i === 0 ? cfg.hex : PALETTE[i]} fillOpacity={0.22} />;
                  })}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip {...chartTheme.tooltip} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">Pick players in the compare tool below.</p>
            )
          }
        />
        <ChartFrame
          kicker="Scatter · relationship"
          title="Two-stat relationship"
          actions={
            <>
              <NativeSelect aria-label="X axis stat" value={xKey} onChange={(e) => setXKey(e.target.value)} className="h-8 text-xs" data-testid="select-scatter-x">
                {cfg.columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    X: {c.label}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect aria-label="Y axis stat" value={yKey} onChange={(e) => setYKey(e.target.value)} className="h-8 text-xs" data-testid="select-scatter-y">
                {cfg.columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    Y: {c.label}
                  </option>
                ))}
              </NativeSelect>
            </>
          }
          ariaLabel={`Scatter plot of ${xCol.desc} against ${yCol.desc}`}
          table={{ headers: ['Player', colLabel(xCol, mode), colLabel(yCol, mode)], rows: scatter.map((d) => [d.name, fmt(d.x, colFmt(xCol, mode)), fmt(d.y, colFmt(yCol, mode))]) }}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: -6, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid stroke={chartTheme.grid} />
                <XAxis type="number" dataKey="x" name={xCol.label} stroke={chartTheme.axis} fontSize={11} tickFormatter={(v) => fmt(v, colFmt(xCol, mode))} />
                <YAxis type="number" dataKey="y" name={yCol.label} stroke={chartTheme.axis} fontSize={11} tickFormatter={(v) => fmt(v, colFmt(yCol, mode))} />
                <ZAxis type="number" dataKey="z" range={[40, 260]} name="Score" />
                <Tooltip {...chartTheme.tooltip} formatter={(v: number, n: string) => (n === xCol.label ? fmt(v, colFmt(xCol, mode)) : n === yCol.label ? fmt(v, colFmt(yCol, mode)) : v.toFixed(1))} labelFormatter={() => ''} />
                <Scatter data={scatter} fill={cfg.hex} fillOpacity={0.75}>
                  {scatter.map((d) => (
                    <Cell key={d.name} fill={view === 'player' && d.name === player?.name ? 'hsl(74 100% 61%)' : cfg.hex} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <ChartFrame
          kicker="Pie · share"
          title={`Share of team ${cfg.scoreUnit.toLowerCase()}`}
          ariaLabel={`Pie chart of each player's share of team ${cfg.scoreUnit.toLowerCase()}`}
          table={{ headers: ['Player', cfg.scoreUnit], rows: pie.map((p) => [p.name, p.value]) }}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieTop} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="82%" paddingAngle={2} stroke="none">
                  {pieTop.map((d, i) => (
                    <Cell key={d.name} fill={i === 0 ? cfg.hex : PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip {...chartTheme.tooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          }
        />
        <Panel kicker="Choose 2 to 3 players" title="Compare players">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {compare.map((id, i) => {
              const p = roster.find((x) => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 py-1 pl-3 pr-1 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: i === 0 ? cfg.hex : PALETTE[i] }} />
                  {p?.name}
                  <button aria-label={`Remove ${p?.name} from comparison`} className="grid h-6 w-6 place-items-center rounded-full hover:bg-muted" onClick={() => setCompare((c) => c.filter((x) => x !== id))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            {compare.length < 3 && (
              <NativeSelect aria-label="Add player to comparison" value="" onChange={(e) => e.target.value && setCompare((c) => [...c, e.target.value].slice(0, 3))} className="h-8 text-xs" data-testid="select-compare-add">
                <option value="">+ Add player</option>
                {ranked
                  .filter((p) => !compare.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.position})
                    </option>
                  ))}
              </NativeSelect>
            )}
          </div>
          {compare.length < 2 ? (
            <p className="text-sm text-muted-foreground">Add at least two players to compare side by side.</p>
          ) : (
            <div className="scrollbar-thin max-h-80 overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left">Stat</th>
                    {compare.map((id) => (
                      <th key={id} scope="col" className="px-3 py-2 text-right">
                        {roster.find((p) => p.id === id)?.name.split(' ').slice(-1)[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/60">
                    <th scope="row" className="px-3 py-1.5 text-left font-medium text-sport">Score</th>
                    {compare.map((id) => (
                      <td key={id} className="px-3 py-1.5 text-right font-semibold tabular">
                        {scores[id]?.score.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  {cfg.columns
                    .filter((c) => compare.some((id) => Number.isFinite(val(id, c.key))))
                    .map((c) => {
                      const vs = compare.map((id) => val(id, c.key));
                      const fin = vs.filter(Number.isFinite);
                      const best = fin.length ? (c.higher ? Math.max(...fin) : Math.min(...fin)) : NaN;
                      return (
                        <tr key={c.key} className="border-t border-border/60">
                          <th scope="row" className="px-3 py-1.5 text-left font-normal text-muted-foreground">
                            {colLabel(c, mode)}
                          </th>
                          {vs.map((v, i) => (
                            <td key={compare[i]} className={cn('px-3 py-1.5 text-right tabular', v === best && fin.length > 1 && 'font-bold text-sport')}>
                              {fmt(v, colFmt(c, mode))}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        kicker={`${mode === 'pg' ? 'Per game' : 'Totals'} · ${range === 'all' ? 'Season' : `Last ${range}`}`}
        title={view === 'team' ? 'Team stat table' : `${pName} stat line`}
        bodyClass="p-0"
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv} data-testid="button-export-csv">
            <Download /> Export CSV
          </Button>
        }
      >
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">Player statistics. Select a column header to sort.</caption>
            <thead className="bg-surface/60 text-[11px] uppercase tracking-wider">
              <tr>
                {[{ key: 'name', label: 'Player' }, { key: 'gp', label: 'GP' }, ...tableCols.map((c) => ({ key: c.key, label: colLabel(c, mode) }))].map((h) => (
                  <th key={h.key} scope="col" aria-sort={sort.key === h.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={cn('px-3 py-2', h.key === 'name' ? 'sticky left-0 bg-surface text-left' : 'text-right')}>
                    <button onClick={() => setSort((x) => ({ key: h.key, dir: x.key === h.key ? (x.dir === 1 ? -1 : 1) : -1 }))} className={cn('inline-flex items-center gap-1 font-semibold', sort.key === h.key ? 'text-sport' : 'text-muted-foreground hover:text-foreground')}>
                      {h.label}
                      {sort.key === h.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownRows.map((p) => (
                <tr key={p.id} className="border-t border-border/50 hover:bg-sport/[0.04]">
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-card px-3 py-2 text-left font-medium">
                    <Link href={`/${cfg.id}/roster/${p.id}`} className="hover:text-sport">
                      {p.name}
                    </Link>
                    <span className="ml-1.5 text-[10px] font-bold text-sport">{p.position}</span>
                  </th>
                  <td className="px-3 py-2 text-right tabular">{ps[p.id]?.gp ?? 0}</td>
                  {tableCols.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-right tabular">
                      {fmt(val(p.id, c.key), colFmt(c, mode))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
