/**
 * App state: React Context + useReducer, persisted to localStorage.
 * Each sport's state is built lazily from the seeded generator the first time it is opened.
 */
import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { SportId, SportState } from '@/lib/types';
import { SPORTS } from '@/sports';
import { buildSport, DATA_VERSION } from '@/data/generate';

type Data = Partial<Record<SportId, SportState>>;
type Action = { type: 'update'; sport: SportId; fn: (s: SportState) => SportState } | { type: 'reset'; sport: SportId };

const KEY = 'coachiq.v1';

export type StorageStatus = 'pending' | 'saved' | 'error';

export function storageFeedback(status: StorageStatus): string {
  if (status === 'error') return 'Not saved to this browser — kept in this tab only';
  if (status === 'pending') return 'Saving to this browser…';
  return 'Saved in this browser';
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Data;
    for (const k of Object.keys(parsed) as SportId[]) if (parsed[k]?.version !== DATA_VERSION) delete parsed[k];
    return parsed;
  } catch {
    return {};
  }
}

function ensure(d: Data, sport: SportId): SportState {
  return d[sport] ?? buildSport(SPORTS[sport]);
}

function reducer(state: Data, a: Action): Data {
  if (a.type === 'reset') return { ...state, [a.sport]: buildSport(SPORTS[a.sport]) };
  return { ...state, [a.sport]: a.fn(ensure(state, a.sport)) };
}

interface Ctx {
  data: Data;
  storageStatus: StorageStatus;
  retrySave: () => void;
  get: (s: SportId) => SportState;
  update: (s: SportId, fn: (st: SportState) => SportState) => void;
  reset: (s: SportId) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);
  const [retry, retrySave] = useReducer((n: number) => n + 1, 0);
  const [attempt, setAttempt] = useState<{ data: Data; retry: number; status: StorageStatus } | null>(null);
  // Never expose a previous snapshot's successful write as the current save result.
  const storageStatus = attempt?.data === data && attempt.retry === retry ? attempt.status : 'pending';
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      setAttempt({ data, retry, status: 'saved' });
    } catch {
      setAttempt({ data, retry, status: 'error' });
    }
  }, [data, retry]);
  const cache = useMemo(() => new Map<SportId, SportState>(), []);
  const value = useMemo<Ctx>(
    () => ({
      data,
      storageStatus,
      retrySave,
      get: (s) => {
        if (data[s]) return data[s]!;
        if (!cache.has(s)) cache.set(s, buildSport(SPORTS[s]));
        return cache.get(s)!;
      },
      update: (sport, fn) => dispatch({ type: 'update', sport, fn }),
      reset: (sport) => {
        cache.delete(sport);
        dispatch({ type: 'reset', sport });
      },
    }),
    [data, cache, storageStatus],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside provider');
  return c;
}
