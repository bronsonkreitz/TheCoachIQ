import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { RotateCcw, LayoutDashboard, Users, BarChart3, Shuffle, ClipboardList, CalendarDays, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPORTS, SPORT_LIST, isSport } from '@/sports';
import type { SportId } from '@/lib/types';
import { SportProvider, useSport } from '@/store/sport-context';
import { imgUrl } from '@/lib/format';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import NotFound from '@/pages/not-found';

const TABS = [
  { seg: '', label: 'Overview', icon: LayoutDashboard },
  { seg: 'roster', label: 'Roster', icon: Users },
  { seg: 'stats', label: 'Stats', icon: BarChart3 },
  { seg: 'lineup', label: 'Lineup', icon: Shuffle },
  { seg: 'practice', label: 'Practice', icon: ClipboardList },
  { seg: 'games', label: 'Games', icon: CalendarDays },
  { seg: 'tools', label: 'Tools', icon: Wrench },
];

function TeamHeader() {
  const { cfg, s, rec, reset } = useSport();
  const [loc, navigate] = useLocation();
  const { toast } = useToast();
  const sub = loc.split('/').slice(2).join('/');
  const recText = cfg.allowDraws ? `${rec.w}-${rec.d}-${rec.l}` : `${rec.w}-${rec.l}`;
  return (
    <div className="relative overflow-hidden border-b border-border">
      <img src={imgUrl(cfg.image)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.22]" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
      <div className="absolute inset-0 board-grid opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center sm:h-20 sm:w-20" aria-label={`${s.team.name} logo placeholder`} role="img">
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
                <path d="M50 4 L92 27 L92 73 L50 96 L8 73 L8 27 Z" fill="hsl(var(--sport) / 0.14)" stroke="hsl(var(--sport))" strokeWidth="3" />
              </svg>
              <span className="relative font-display text-xl font-black tracking-tight text-sport sm:text-2xl">{s.team.abbr}</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sport">
                {cfg.number} / {cfg.name} · {s.team.league}
              </p>
              <h1 className="font-display text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl" data-testid="text-team-name">
                {s.team.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-foreground/10 px-2 py-0.5 font-semibold tabular" data-testid="text-record">
                  {recText}
                </span>
                <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold tabular', rec.streak.startsWith('W') ? 'bg-good/15 text-good' : rec.streak.startsWith('L') ? 'bg-bad/15 text-bad' : 'bg-muted text-muted-foreground')} data-testid="text-streak">
                  Streak {rec.streak || '—'}
                </span>
                <span className="text-muted-foreground">{s.games.length} games played</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sport-switch" className="sr-only">
              Switch sport
            </label>
            <select
              id="sport-switch"
              data-testid="select-sport-switch"
              value={cfg.id}
              onChange={(e) => navigate(`/${e.target.value}${sub && !sub.startsWith('roster/') ? `/${sub}` : ''}`)}
              className="h-9 rounded-lg border border-border bg-background/80 px-3 text-sm font-semibold"
            >
              {SPORT_LIST.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background/80 text-muted-foreground transition-colors hover:text-foreground" aria-label="Reset demo data" title="Reset demo data" data-testid="button-reset-data">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset {cfg.name} demo data?</AlertDialogTitle>
                  <AlertDialogDescription>All roster edits, added games, saved lineups, practice plans and tool settings for {s.team.name} will be replaced with the original fictional season.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    data-testid="button-confirm-reset"
                    onClick={() => {
                      reset();
                      toast({ title: 'Demo data restored', description: `${s.team.name} is back to the original season.` });
                    }}
                  >
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <nav className="scrollbar-thin -mx-4 mt-7 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={`${cfg.name} dashboard`}>
          {TABS.map((t) => {
            const href = `/${cfg.id}${t.seg ? `/${t.seg}` : ''}`;
            const active = t.seg ? loc === href || loc.startsWith(`${href}/`) : loc === href;
            const Icon = t.icon;
            return (
              <Link
                key={t.seg}
                href={href}
                aria-current={active ? 'page' : undefined}
                data-testid={`tab-${t.label.toLowerCase()}`}
                className={cn('relative flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-colors', active ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Icon className={cn('h-4 w-4', active && 'text-sport')} />
                {t.label}
                {active && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-sport" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** Mirrors the sport accent onto :root so portaled dialogs and popovers match. */
function AccentSync({ accent }: { accent: string }) {
  useEffect(() => {
    const r = document.documentElement.style;
    for (const k of ['--sport', '--primary', '--ring']) r.setProperty(k, accent);
    return () => {
      for (const k of ['--sport', '--primary', '--ring']) r.removeProperty(k);
    };
  }, [accent]);
  return null;
}

export function SportShell({ sport, children }: { sport: string | undefined; children: ReactNode }) {
  if (!isSport(sport)) return <NotFound />;
  const cfg = SPORTS[sport as SportId];
  const style = { '--sport': cfg.accent, '--primary': cfg.accent, '--ring': cfg.accent, '--primary-foreground': '224 53% 9%' } as CSSProperties;
  return (
    <SportProvider id={sport}>
      <AccentSync accent={cfg.accent} />
      <div style={style} className="min-h-full">
        <TeamHeader />
        <div key={sport} className="rise mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </div>
    </SportProvider>
  );
}
