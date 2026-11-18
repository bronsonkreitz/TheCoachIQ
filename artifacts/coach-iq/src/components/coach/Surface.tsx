import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';
import type { SportConfig } from '@/sports/types';

const DIMS: Record<SportConfig['surface'], [number, number]> = {
  court: [100, 94],
  diamond: [100, 100],
  pitch: [100, 64],
  gridiron: [100, 54],
  rink: [100, 50],
};

const L = { stroke: 'hsl(var(--foreground) / 0.32)', strokeWidth: 0.45, fill: 'none' };

export function SurfaceLines({ surface }: { surface: SportConfig['surface'] }) {
  switch (surface) {
    case 'court':
      return (
        <g {...L}>
          <rect x="0.5" y="0.5" width="99" height="93" />
          <rect x="34" y="0.5" width="32" height="36" fill="hsl(var(--sport) / 0.08)" />
          <circle cx="50" cy="36" r="12" />
          <path d="M6 0.5 L6 26 A47.5 47.5 0 0 0 94 26 L94 0.5" />
          <circle cx="50" cy="8" r="1.6" stroke="hsl(var(--sport))" />
          <line x1="44" y1="5" x2="56" y2="5" />
          <path d="M38 94 A12 12 0 0 1 62 94" />
        </g>
      );
    case 'diamond':
      return (
        <g {...L}>
          <path d="M50 94 L4 48 A66 66 0 0 1 96 48 Z" fill="hsl(var(--sport) / 0.05)" />
          <circle cx="50" cy="70" r="24" fill="hsl(var(--foreground) / 0.04)" />
          <path d="M50 92 L72 70 L50 48 L28 70 Z" />
          <circle cx="50" cy="68" r="2.4" />
          {[
            [50, 92],
            [72, 70],
            [50, 48],
            [28, 70],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x - 1.2} y={y - 1.2} width="2.4" height="2.4" fill="hsl(var(--foreground) / 0.6)" transform={`rotate(45 ${x} ${y})`} />
          ))}
        </g>
      );
    case 'pitch':
      return (
        <g {...L}>
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={i * 10} y="0" width="10" height="64" fill={i % 2 ? 'hsl(var(--sport) / 0.03)' : 'transparent'} stroke="none" />
          ))}
          <rect x="1" y="1" width="98" height="62" />
          <line x1="50" y1="1" x2="50" y2="63" />
          <circle cx="50" cy="32" r="9" />
          <rect x="1" y="14" width="16" height="36" />
          <rect x="83" y="14" width="16" height="36" />
          <rect x="1" y="24" width="6" height="16" />
          <rect x="93" y="24" width="6" height="16" />
          <path d="M17 26 A8 8 0 0 1 17 38" />
          <path d="M83 26 A8 8 0 0 0 83 38" />
        </g>
      );
    case 'gridiron':
      return (
        <g {...L}>
          <rect x="0.5" y="0.5" width="99" height="53" />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={10 + i * 10} y1="0.5" x2={10 + i * 10} y2="53.5" />
          ))}
          {Array.from({ length: 45 }, (_, i) => (
            <g key={`h${i}`}>
              <line x1={5 + i * 2} y1="20" x2={5 + i * 2} y2="21" />
              <line x1={5 + i * 2} y1="33" x2={5 + i * 2} y2="34" />
            </g>
          ))}
          <line x1="50" y1="0.5" x2="50" y2="53.5" stroke="hsl(var(--sport))" strokeWidth="0.7" />
        </g>
      );
    case 'rink':
      return (
        <g {...L}>
          <rect x="0.5" y="0.5" width="99" height="49" rx="12" />
          <line x1="50" y1="0.5" x2="50" y2="49.5" stroke="hsl(356 85% 66% / 0.6)" strokeWidth="0.8" />
          <line x1="36" y1="0.5" x2="36" y2="49.5" stroke="hsl(var(--sport) / 0.7)" strokeWidth="0.8" />
          <line x1="64" y1="0.5" x2="64" y2="49.5" stroke="hsl(var(--sport) / 0.7)" strokeWidth="0.8" />
          <line x1="6" y1="3" x2="6" y2="47" />
          <line x1="94" y1="3" x2="94" y2="47" />
          <circle cx="50" cy="25" r="7" />
          {[
            [20, 13],
            [20, 37],
            [80, 13],
            [80, 37],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="7" />
          ))}
          <path d="M6 21 A4 4 0 0 1 6 29" fill="hsl(var(--sport) / 0.15)" />
          <path d="M94 21 A4 4 0 0 0 94 29" fill="hsl(var(--sport) / 0.15)" />
        </g>
      );
  }
}

export interface Token {
  id: string;
  x: number;
  y: number;
  label: string;
  player?: Player;
  sub?: string;
}

export function SurfaceDiagram({
  surface,
  tokens,
  onSwap,
  children,
  className,
  ariaLabel,
}: {
  surface: SportConfig['surface'];
  tokens: Token[];
  onSwap?: (fromSlot: string, toSlot: string) => void;
  children?: ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  const [w, h] = DIMS[surface];
  return (
    <div className={cn('relative w-full overflow-visible rounded-2xl border border-border bg-gradient-to-b from-surface to-background', className)} style={{ aspectRatio: `${w} / ${h}` }} role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <SurfaceLines surface={surface} />
        {children}
      </svg>
      {tokens.map((t, i) => (
        <div
          key={t.id}
          className="rise absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: `${t.x}%`, top: `${(t.y / 100) * 100}%`, animationDelay: `${i * 40}ms` }}
          draggable={!!onSwap && !!t.player}
          onDragStart={(e) => e.dataTransfer.setData('text/slot', t.id)}
          onDragOver={(e) => onSwap && e.preventDefault()}
          onDrop={(e) => {
            const from = e.dataTransfer.getData('text/slot');
            if (from && onSwap && from !== t.id) onSwap(from, t.id);
          }}
          data-testid={`token-${t.id}`}
        >
          <div className={cn('grid h-7 w-7 place-items-center rounded-full border-2 text-[10px] font-bold shadow-lg sm:h-9 sm:w-9 sm:text-xs tabular', t.player ? 'border-sport bg-background text-foreground' : 'border-dashed border-muted-foreground bg-background/80 text-muted-foreground')}>
            {t.player ? t.player.number : t.label}
          </div>
          <span className="mt-0.5 hidden max-w-[84px] truncate rounded bg-background/85 px-1 text-[9px] font-semibold sm:block sm:text-[10px]">
            {t.player ? t.player.name.split(' ').slice(-1)[0] : '—'}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-sport sm:text-[9px]">{t.sub ?? t.label}</span>
        </div>
      ))}
    </div>
  );
}
