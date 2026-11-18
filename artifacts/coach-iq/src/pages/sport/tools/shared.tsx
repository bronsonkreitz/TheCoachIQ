import type { Player } from '@/lib/types';
import type { PlayerScore } from '@/lib/analytics';
import { NativeSelect } from '@/components/coach/ui';

export function PlayerPick({ value, onChange, players, label, scores, className }: { value: string | null | undefined; onChange: (id: string) => void; players: Player[]; label: string; scores?: Record<string, PlayerScore>; className?: string }) {
  return (
    <NativeSelect aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={className ?? 'w-full'}>
      <option value="">—</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          #{p.number} {p.name} ({p.position}){scores?.[p.id] ? ` ${scores[p.id].score.toFixed(0)}` : ''}{p.status !== 'Active' ? ` · ${p.status}` : ''}
        </option>
      ))}
    </NativeSelect>
  );
}

export const byScore = (ps: Player[], scores: Record<string, PlayerScore>) => [...ps].sort((a, b) => (scores[b.id]?.score ?? 0) - (scores[a.id]?.score ?? 0));
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
