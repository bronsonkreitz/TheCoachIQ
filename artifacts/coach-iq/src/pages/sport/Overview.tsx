import { useMemo } from 'react';
import { Link } from 'wouter';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, CalendarClock, Flame, Target, TriangleAlert, Trophy } from 'lucide-react';
import { useSport } from '@/store/sport-context';
import { lastNIds, resultOf, teamAgg } from '@/lib/analytics';
import { fmt, fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Panel, PlayerAvatar, ScoreBar, StatusBadge, Trend, chartTheme } from '@/components/coach/ui';

export default function Overview() {
  const { cfg, s, scores, agg, benches, roster } = useSport();
  const recent = useMemo(() => teamAgg(s, lastNIds(s.games, 5)), [s]);
  const sorted = useMemo(() => [...s.games].sort((a, b) => a.date.localeCompare(b.date)), [s.games]);
  const last10 = sorted.slice(-10).map((g) => ({ name: fmtDate(g.date), opp: g.opponent, For: g.scoreFor, Against: g.scoreAgainst }));
  const top = [...roster].filter((p) => scores[p.id]).sort((a, b) => scores[b.id].score - scores[a.id].score).slice(0, 3);
  const weak = benches.slice(0, 3);
  const last = sorted[sorted.length - 1];
  const next = [...s.upcoming].sort((a, b) => a.date.localeCompare(b.date))[0];
  const injured = roster.filter((p) => p.status !== 'Active');
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cfg.kpis.map((k, i) => {
          const v = k.value(agg);
          const r = k.value(recent);
          return (
            <div key={k.label} className="lift rise rounded-2xl border border-card-border bg-card p-4" style={{ animationDelay: `${i * 50}ms` }} data-testid={`kpi-${i}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="mt-2 font-display text-3xl font-black tabular">{fmt(v, k.fmt)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Trend delta={r - v} higher={k.higher} />
                Last 5: <span className="tabular text-foreground">{fmt(r, k.fmt)}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel kicker="Last 10 games" title={`${cfg.scoreUnit} for vs against`} actions={<Link href={`/${cfg.id}/games`} className="text-sm font-semibold text-sport hover:underline">Game log</Link>}>
          <div className="h-64" role="img" aria-label={`Area chart of ${cfg.scoreUnit.toLowerCase()} scored and allowed over the last 10 games`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last10} margin={{ left: -18, right: 6, top: 8 }}>
                <defs>
                  <linearGradient id="gFor" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={cfg.hex} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={cfg.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={11} tickLine={false} />
                <YAxis stroke={chartTheme.axis} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip {...chartTheme.tooltip} />
                <Area type="monotone" dataKey="For" stroke={cfg.hex} strokeWidth={2.5} fill="url(#gFor)" />
                <Area type="monotone" dataKey="Against" stroke="hsl(218 22% 62%)" strokeDasharray="4 4" strokeWidth={1.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-1" aria-label="Results, oldest to newest">
            {sorted.slice(-10).map((g) => {
              const r = resultOf(g);
              return (
                <span key={g.id} title={`${r} ${g.scoreFor}-${g.scoreAgainst} vs ${g.opponent}`} className={cn('flex-1 rounded py-1 text-center text-[10px] font-bold', r === 'W' ? 'bg-good/15 text-good' : r === 'L' ? 'bg-bad/15 text-bad' : 'bg-muted text-muted-foreground')}>
                  {r}
                </span>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-6">
          {next && (
            <div className="relative overflow-hidden rounded-2xl border border-sport/40 bg-gradient-to-br from-sport/20 via-card to-card p-5" data-testid="card-next-game">
              <CalendarClock className="absolute -right-3 -top-3 h-24 w-24 text-sport/10" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">Next game</p>
              <p className="mt-2 font-display text-2xl font-black uppercase leading-tight">
                {next.homeAway === 'Home' ? 'vs' : 'at'} {next.opponent}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{fmtDate(next.date, { weekday: 'long', month: 'short', day: 'numeric' })} · {next.homeAway}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/${cfg.id}/lineup`} className="inline-flex items-center gap-1.5 rounded-lg bg-sport px-3 py-1.5 text-sm font-semibold text-background" data-testid="link-build-lineup">
                  Build lineup <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={`/${cfg.id}/practice`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold" data-testid="link-plan-practice">
                  Plan practice
                </Link>
              </div>
            </div>
          )}
          {last && (
            <div className="rounded-2xl border border-card-border bg-card p-5" data-testid="card-last-result">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Last result · {fmtDate(last.date)}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-display text-xl font-bold uppercase leading-tight">
                  {last.homeAway === 'Home' ? 'vs' : 'at'} {last.opponent}
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', resultOf(last) === 'W' ? 'bg-good/15 text-good' : resultOf(last) === 'L' ? 'bg-bad/15 text-bad' : 'bg-muted')}>{resultOf(last)}</span>
                  <span className="font-display text-3xl font-black tabular">
                    {last.scoreFor}-{last.scoreAgainst}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="By performance score" title={<span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-sport" /> Top performers</span>} actions={<Link href={`/${cfg.id}/roster`} className="text-sm font-semibold text-sport hover:underline">Full roster</Link>}>
          <ol className="space-y-3">
            {top.map((p, i) => {
              const sc = scores[p.id];
              const lead = sc.contributions[0];
              return (
                <li key={p.id}>
                  <Link href={`/${cfg.id}/roster/${p.id}`} className="group flex items-center gap-4 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/40" data-testid={`link-top-${i}`}>
                    <span className="w-6 font-display text-3xl font-black text-sport/70 tabular">{i + 1}</span>
                    <PlayerAvatar name={p.name} number={p.number} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.position} · {lead ? `${lead.label} ${lead.pct}th pct` : 'No data'}
                        {sc.formScore - sc.seasonScore > 6 && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-sport">
                            <Flame className="h-3 w-3" /> hot
                          </span>
                        )}
                      </p>
                      <ScoreBar value={sc.score} className="mt-2" />
                    </div>
                    <span className="font-display text-2xl font-black tabular">{sc.score.toFixed(1)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel kicker="Vs league benchmark" title={<span className="flex items-center gap-2"><TriangleAlert className="h-5 w-5 text-bad" /> Needs attention</span>} actions={<Link href={`/${cfg.id}/practice`} className="text-sm font-semibold text-sport hover:underline">Fix in practice</Link>}>
          <ul className="space-y-3">
            {weak.map((b) => (
              <li key={b.bench.key} className="rounded-xl border border-border bg-background/40 p-3" data-testid={`weak-${b.bench.key}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{b.bench.label}</p>
                  <span className="text-xs font-bold text-bad tabular">{(b.gap * 100).toFixed(1)}% vs league</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Team <span className="text-foreground tabular">{fmt(b.value, b.bench.fmt)}</span>
                  </span>
                  <span>
                    League <span className="text-foreground tabular">{fmt(b.bench.league, b.bench.fmt)}</span>
                  </span>
                  <span className="ml-auto">
                    Index <span className="text-foreground tabular">{b.index}</span>
                  </span>
                </div>
                <div className="relative mt-2 h-1.5 rounded-full bg-muted">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-bad/80" style={{ width: `${b.index}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel kicker="Availability" title="Injury report">
          {injured.length ? (
            <ul className="divide-y divide-border">
              {injured.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/${cfg.id}/roster/${p.id}`} className="flex items-center gap-3 hover:underline">
                    <PlayerAvatar name={p.name} size="sm" />
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.position}</span>
                  </Link>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Everyone is cleared to play.</p>
          )}
        </Panel>
        <Panel kicker={`${cfg.name} tools`} title={<span className="flex items-center gap-2"><Target className="h-5 w-5 text-sport" /> Special modules</span>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {cfg.tools.map((t) => (
              <Link key={t.id} href={`/${cfg.id}/tools?t=${t.id}`} className="lift group rounded-xl border border-border bg-background/40 p-4" data-testid={`link-tool-${t.id}`}>
                <p className="font-display text-lg font-bold uppercase">{t.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sport">
                  Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
