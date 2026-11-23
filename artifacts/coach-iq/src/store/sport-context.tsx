import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { SportId, SportState } from '@/lib/types';
import { SPORTS } from '@/sports';
import type { SportConfig } from '@/sports/types';
import { benchmarkRows, computeScores, record, teamAgg, type BenchRow, type PlayerScore } from '@/lib/analytics';
import type { TeamAgg } from '@/sports/types';
import { useStore } from './store';

export interface SportCtxValue {
  id: SportId;
  cfg: SportConfig;
  s: SportState;
  scores: Record<string, PlayerScore>;
  agg: TeamAgg;
  rec: ReturnType<typeof record>;
  benches: BenchRow[];
  roster: SportState['players'];
  update: (fn: (s: SportState) => SportState) => void;
  reset: () => void;
}

const SportCtx = createContext<SportCtxValue | null>(null);

export function SportProvider({ id, children }: { id: SportId; children: ReactNode }) {
  const store = useStore();
  if (store.damaged.includes(id) || store.unreadable !== null || store.readFailed) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16" data-testid="status-sport-recovery">
        <h1 className="text-2xl font-semibold">{SPORTS[id].name} saved data needs recovery</h1>
        <p className="mt-3 text-muted-foreground">
          Your saved work has not been erased. Use the recovery controls above to keep a copy before resetting.
          {store.damaged.includes(id) && ' Other undamaged sports remain available.'}
        </p>
      </section>
    );
  }
  return <ReadySportProvider id={id}>{children}</ReadySportProvider>;
}

function ReadySportProvider({ id, children }: { id: SportId; children: ReactNode }) {
  const store = useStore();
  const s = store.get(id);
  const cfg = SPORTS[id];
  const value = useMemo<SportCtxValue>(() => {
    const agg = teamAgg(s);
    return {
      id,
      cfg,
      s,
      scores: computeScores(cfg, s.players, s.games),
      agg,
      rec: record(s.games),
      benches: benchmarkRows(cfg, agg),
      roster: s.players.filter((p) => !p.removed),
      update: (fn) => store.update(id, fn),
      reset: () => store.reset(id),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, id]);
  return <SportCtx.Provider value={value}>{children}</SportCtx.Provider>;
}

export function useSport() {
  const c = useContext(SportCtx);
  if (!c) throw new Error('useSport outside SportProvider');
  return c;
}

/** Typed accessor for sport-specific tool state persisted in SportState.tools. */
export function useTool<T>(key: string, fallback: T): [T, (v: T) => void] {
  const { s, update } = useSport();
  const v = (s.tools[key] as T | undefined) ?? fallback;
  return [v, (nv: T) => update((st) => ({ ...st, tools: { ...st.tools, [key]: nv } }))];
}
