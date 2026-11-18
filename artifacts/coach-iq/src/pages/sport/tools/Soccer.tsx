import { CartesianGrid, ComposedChart, Bar, Line, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSport, useTool } from '@/store/sport-context';
import { Button } from '@/components/ui/button';
import { chartTheme } from '@/components/coach/ui';
import { fmtDate } from '@/lib/format';
import { byScore, PlayerPick } from './shared';

export function Possession() {
  const { cfg, s } = useSport();
  const games = [...s.games].sort((a, b) => a.date.localeCompare(b.date));
  const data = games.map((g) => {
    const ls = s.players.flatMap((p) => p.gameStats.filter((l) => l.gameId === g.id).map((l) => l.s));
    const pa = ls.reduce((a, l) => a + (l.pa ?? 0), 0);
    const pc = ls.reduce((a, l) => a + (l.pc ?? 0), 0);
    return { name: fmtDate(g.date), opp: g.opponent, Possession: Math.round(g.extra.poss ?? 50), 'Pass %': pa ? Math.round((pc / pa) * 1000) / 10 : 0, Passes: pa };
  });
  const avg = (k: 'Possession' | 'Pass %') => data.reduce((a, d) => a + d[k], 0) / Math.max(1, data.length);
  return (
    <div>
      <div className="mb-3 flex gap-6 text-sm">
        <span>Avg possession <b className="tabular text-sport">{avg('Possession').toFixed(1)}%</b></span>
        <span>Avg pass completion <b className="tabular text-sport">{avg('Pass %').toFixed(1)}%</b></span>
      </div>
      <div className="h-72" role="img" aria-label="Possession and passing by game">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: -10, right: 0, top: 8 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="name" stroke={chartTheme.axis} fontSize={11} />
            <YAxis yAxisId="l" domain={[0, 100]} stroke={chartTheme.axis} fontSize={11} />
            <YAxis yAxisId="r" orientation="right" stroke={chartTheme.axis} fontSize={11} />
            <Tooltip {...chartTheme.tooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="r" dataKey="Passes" fill="hsl(218 22% 62% / 0.35)" radius={[4, 4, 0, 0]} />
            <Line yAxisId="l" dataKey="Possession" stroke={cfg.hex} strokeWidth={2.5} />
            <Line yAxisId="l" dataKey="Pass %" stroke="hsl(74 100% 61%)" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const ROLES = [
  ['cornerL', 'Corners (left)'], ['cornerR', 'Corners (right)'], ['fkDirect', 'Direct free kicks'], ['fkIndirect', 'Indirect / crossed free kicks'],
  ['penalty1', 'Penalty taker 1'], ['penalty2', 'Penalty taker 2'], ['nearPost', 'Near-post runner'], ['wall', 'Wall organiser'],
] as const;

export function SetPieces() {
  const { roster, scores } = useSport();
  const outfield = byScore(roster.filter((p) => p.position !== 'GK'), scores);
  const [roles, setRoles] = useTool<Record<string, string>>('soccer.setpieces', {});
  const auto = () => {
    const by = (k: string) => [...outfield].sort((a, b) => (scores[b.id]?.stats[k] ?? 0) - (scores[a.id]?.stats[k] ?? 0));
    const ast = by('a');
    const gl = by('g');
    setRoles({ cornerL: ast[0]?.id, cornerR: ast[1]?.id, fkDirect: gl[0]?.id, fkIndirect: ast[2]?.id ?? ast[0]?.id, penalty1: gl[0]?.id, penalty2: gl[1]?.id, nearPost: gl[2]?.id, wall: outfield.find((p) => p.position.includes('B') || p.position === 'CB')?.id ?? '' });
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Saved role assignments. Auto assigns by assists (deliveries) and goals (finishers).</p>
        <Button size="sm" onClick={auto}>Auto assign</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map(([k, label]) => {
          const p = roster.find((x) => x.id === roles[k]);
          return (
            <div key={k} className="rounded-xl border border-border p-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-sport">{label}</p>
              <PlayerPick label={label} value={roles[k]} onChange={(v) => setRoles({ ...roles, [k]: v })} players={outfield} scores={scores} />
              {p && <p className="mt-1 text-xs text-muted-foreground">{scores[p.id]?.stats.g ?? 0} G · {scores[p.id]?.stats.a ?? 0} A this season{p.status !== 'Active' ? ` · ${p.status}` : ''}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
