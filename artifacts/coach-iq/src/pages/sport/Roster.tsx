import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2, UserX } from 'lucide-react';
import { useSport } from '@/store/sport-context';
import { colVal } from '@/lib/analytics';
import { fmt } from '@/lib/format';
import type { Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Empty, NativeSelect, PlayerAvatar, ScoreBar, Seg, StatusBadge } from '@/components/coach/ui';
import { PlayerFormDialog } from '@/components/coach/PlayerFormDialog';
import { removePlayer } from '@/store/actions';
import { useToast } from '@/hooks/use-toast';

type SortKey = string;

export default function Roster() {
  const { cfg, scores, roster, update } = useSport();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState('all');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'score', dir: -1 });
  const [editing, setEditing] = useState<Player | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Player | null>(null);
  const cols = cfg.rosterCols.map((k) => cfg.columns.find((c) => c.key === k)!).filter(Boolean);

  const value = (p: Player, key: string): number | string => {
    const sc = scores[p.id];
    if (key === 'name') return p.name;
    if (key === 'number') return p.number;
    if (key === 'position') return cfg.positions.indexOf(p.position);
    if (key === 'status') return p.status;
    if (key === 'score') return sc?.score ?? 0;
    const col = cfg.columns.find((c) => c.key === key);
    return col && sc ? colVal(col, sc.stats, sc.gp, cfg.defaultMode) : NaN;
  };

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return roster
      .filter((p) => (pos === 'all' || p.position === pos || cfg.unit?.(p.position) === pos) && (status === 'all' || p.status === status) && (!t || p.name.toLowerCase().includes(t) || String(p.number) === t))
      .sort((a, b) => {
        const va = value(a, sort.key);
        const vb = value(b, sort.key);
        if (typeof va === 'string' || typeof vb === 'string') return String(va).localeCompare(String(vb)) * sort.dir;
        const fa = Number.isFinite(va) ? va : -Infinity;
        const fb = Number.isFinite(vb) ? vb : -Infinity;
        return (fa - fb) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, q, pos, status, sort, scores]);

  const th = (key: string, label: string, right = false) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={cn('px-3 py-2.5', right && 'text-right')}>
      <button
        data-testid={`sort-${key}`}
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))}
        className={cn('inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground', sort.key === key ? 'text-sport' : 'text-muted-foreground')}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  const units = cfg.unit ? Array.from(new Set(cfg.positions.map((p) => cfg.unit!(p)))) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">{roster.length} players</p>
          <h2 className="font-display text-3xl font-black uppercase">Roster</h2>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          data-testid="button-add-player"
        >
          <Plus /> Add player
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/70 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Search players" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="input-search-roster" />
        </div>
        <NativeSelect aria-label="Filter by position" value={pos} onChange={(e) => setPos(e.target.value)} data-testid="select-filter-position">
          <option value="all">All positions</option>
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
          {cfg.positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-filter-status">
          <option value="all">All statuses</option>
          <option>Active</option>
          <option>Questionable</option>
          <option>Injured</option>
        </NativeSelect>
        <Seg
          label="Roster view"
          size="sm"
          value={view}
          onChange={(v) => setView(v as never)}
          options={[
            { value: 'table', label: 'Table' },
            { value: 'grid', label: 'Cards' },
          ]}
        />
      </div>

      {!rows.length ? (
        <Empty
          icon={<UserX className="h-5 w-5" />}
          title="No players match"
          body="Try a different name, position or status filter."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQ('');
                setPos('all');
                setStatus('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : view === 'table' ? (
        <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-card-border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <caption className="sr-only">Roster. Select a column header to sort.</caption>
            <thead className="border-b border-border bg-surface/60 text-left">
              <tr>
                {th('name', 'Player')}
                {th('number', '#', true)}
                {th('position', 'Pos')}
                {th('status', 'Status')}
                {th('score', 'Score', true)}
                {cols.map((c) => th(c.key, c.count && cfg.defaultMode === 'pg' ? `${c.label}/G` : c.label, true))}
                <th scope="col" className="px-3 py-2.5 text-right text-[11px] uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const sc = scores[p.id];
                return (
                  <tr key={p.id} className="group cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-sport/[0.05]" onClick={() => navigate(`/${cfg.id}/roster/${p.id}`)} data-testid={`row-player-${p.id}`}>
                    <td className="px-3 py-2.5">
                      <Link href={`/${cfg.id}/roster/${p.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 font-semibold group-hover:text-sport">
                        <PlayerAvatar name={p.name} size="sm" />
                        <span>
                          {p.name}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {p.year} · {p.height} · {p.weight} lb
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular">{p.number}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold">{p.position}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="ml-auto flex w-24 items-center gap-2">
                        <ScoreBar value={sc?.score ?? 0} />
                        <span className="w-9 text-right font-semibold tabular">{(sc?.score ?? 0).toFixed(0)}</span>
                      </div>
                    </td>
                    {cols.map((c) => (
                      <td key={c.key} className="px-3 py-2.5 text-right tabular">
                        {sc ? fmt(colVal(c, sc.stats, sc.gp, cfg.defaultMode), c.count && cfg.defaultMode === 'pg' ? 'd1' : c.fmt) : '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">
                        <button
                          aria-label={`Edit ${p.name}`}
                          data-testid={`button-edit-${p.id}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button aria-label={`Remove ${p.name}`} data-testid={`button-remove-${p.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-bad/15 hover:text-bad" onClick={() => setDeleting(p)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p, i) => {
            const sc = scores[p.id];
            return (
              <div key={p.id} className="lift rise relative rounded-2xl border border-card-border bg-card p-4" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} data-testid={`card-player-${p.id}`}>
                <span className="pointer-events-none absolute right-3 top-1 font-display text-6xl font-black text-foreground/[0.05] tabular">{p.number}</span>
                <Link href={`/${cfg.id}/roster/${p.id}`} className="flex items-center gap-3">
                  <PlayerAvatar name={p.name} number={p.number} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold hover:text-sport">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{cfg.positionNames[p.position]}</p>
                  </div>
                </Link>
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge status={p.status} />
                  <span className="font-display text-2xl font-black tabular">{(sc?.score ?? 0).toFixed(1)}</span>
                </div>
                <ScoreBar value={sc?.score ?? 0} className="mt-2" />
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {cols.slice(0, 3).map((c) => (
                    <div key={c.key} className="rounded-lg bg-background/50 px-2 py-1.5">
                      <dt className="text-[10px] uppercase text-muted-foreground">{c.label}</dt>
                      <dd className="text-sm font-semibold tabular">{sc ? fmt(colVal(c, sc.stats, sc.gp, cfg.defaultMode), c.count && cfg.defaultMode === 'pg' ? 'd1' : c.fmt) : '—'}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-bad" onClick={() => setDeleting(p)}>
                    <Trash2 /> Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PlayerFormDialog open={formOpen} onOpenChange={setFormOpen} player={editing} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They leave the roster, lineups and scoring. Their past box-score lines stay so game totals still add up.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-remove"
              onClick={() => {
                if (!deleting) return;
                update((s) => removePlayer(s, deleting.id));
                toast({ title: 'Player removed', description: deleting.name });
                setDeleting(null);
              }}
            >
              Remove player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
