import type { ReactNode, SelectHTMLAttributes } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';
import type { Status } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SCORE_RULES } from '@/sports/common';

export function Panel({ title, kicker, actions, children, className, bodyClass, id }: { title?: ReactNode; kicker?: string; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; id?: string }) {
  return (
    <section id={id} className={cn('rounded-2xl border border-card-border bg-card/80 backdrop-blur-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-card-border/70 px-5 py-4">
          <div>
            {kicker && <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sport">{kicker}</p>}
            {title && <h2 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    Active: 'bg-good/12 text-good border-good/30',
    Questionable: 'bg-amber-300/10 text-amber-200 border-amber-300/30',
    Injured: 'bg-bad/12 text-bad border-bad/30',
  };
  return (
    <span data-testid={`status-${status.toLowerCase()}`} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold', map[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'Active' ? 'bg-good' : status === 'Injured' ? 'bg-bad' : 'bg-amber-200')} />
      {status}
    </span>
  );
}

export function PlayerAvatar({ name, number, size = 'md', className }: { name: string; number?: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-10 w-10 text-sm';
  return (
    <div className={cn('relative shrink-0', className)} aria-hidden>
      <div className={cn('grid place-items-center rounded-xl border border-sport/40 bg-gradient-to-br from-sport/25 to-transparent font-display font-bold text-foreground', s)}>{initials(name)}</div>
      {number != null && size !== 'sm' && (
        <span className="absolute -bottom-1.5 -right-1.5 rounded-md bg-sport px-1 text-[10px] font-bold leading-4 text-background tabular">{number}</span>
      )}
    </div>
  );
}

export function Trend({ delta, higher, className }: { delta: number; higher: boolean; className?: string }) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1e-9) return <Minus className={cn('h-4 w-4 text-muted-foreground', className)} aria-label="flat" />;
  const good = higher ? delta > 0 : delta < 0;
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return <Icon className={cn('h-4 w-4', good ? 'text-good' : 'text-bad', className)} aria-label={good ? 'improving' : 'declining'} />;
}

export function Seg<T extends string>({ value, onChange, options, label, size = 'md' }: { value: T; onChange(v: T): void; options: { value: T; label: string }[]; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-border bg-background/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          data-testid={`seg-${label.toLowerCase().replace(/\s+/g, '-')}-${o.value}`}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-semibold transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-sport text-background shadow-md' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/40 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-sport/30 bg-sport/10 text-sport">{icon ?? <Info className="h-5 w-5" />}</div>
      <p className="font-display text-lg font-bold uppercase">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function ScoreBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)} role="presentation">
      <div className="h-full rounded-full bg-sport transition-all duration-700" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ScoreRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Performance score ${value.toFixed(1)} of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--sport))" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold tabular">{value.toFixed(0)}</span>
    </div>
  );
}

export function ScoringRules({ extra, mode = 'lineup', sportRules }: { extra?: string[]; mode?: 'lineup' | 'practice'; sportRules?: string[] }) {
  return (
    <Collapsible className="rounded-2xl border border-sport/30 bg-sport/[0.06]">
      <CollapsibleTrigger data-testid="button-how-scoring-works" className="group flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left">
        <span className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-sport text-background">
            <Info className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold uppercase tracking-wide">How scoring works</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">score = weighted percentiles x availability x recent form</span>
        </span>
        <span className="text-xs font-semibold text-sport group-data-[state=open]:hidden">Show rules</span>
        <span className="hidden text-xs font-semibold text-sport group-data-[state=open]:inline">Hide</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-5 border-t border-sport/20 px-5 py-4 text-sm md:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">Player performance score (0 to 100)</p>
          <ol className="space-y-1.5 text-muted-foreground">
            {SCORE_RULES.map((r, i) => (
              <li key={r} className="flex gap-2">
                <span className="tabular text-foreground">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">{mode === 'lineup' ? 'Lineup rules' : 'Practice generation'}</p>
          <ul className="space-y-1.5 text-muted-foreground">
            {(mode === 'practice'
              ? [
                  'Every team category is compared to a league benchmark; 50 means league average.',
                  'The three lowest categories become focus areas (you can override them).',
                  'Minutes: warm-up ~12%, focus blocks split 50/30/20, scrimmage 12-27% by intensity, cool-down ~7%.',
                  'Drills are matched by focus tag, then by closest intensity, never repeating while alternatives exist.',
                ]
              : sportRules ?? []
            ).map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sport" />
                {r}
              </li>
            ))}
            {extra?.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sport" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Field({ label, htmlFor, children, error, className }: { label: string; htmlFor?: string; children: ReactNode; error?: string; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-9 rounded-lg border border-input bg-background/70 px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    />
  );
}

export const chartTheme = {
  grid: 'hsl(222 32% 20%)',
  axis: 'hsl(218 22% 62%)',
  tooltip: {
    contentStyle: { background: 'hsl(224 46% 13%)', border: '1px solid hsl(222 32% 24%)', borderRadius: 12, fontSize: 12, color: 'hsl(216 40% 96%)' },
    labelStyle: { color: 'hsl(218 22% 70%)', fontWeight: 600 },
    itemStyle: { color: 'hsl(216 40% 96%)' },
  },
};
