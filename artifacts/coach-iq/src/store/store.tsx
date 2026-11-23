/**
 * Browser-local state. Unusable entries are retained, never passed to views.
 * Healthy sports can still save without overwriting quarantined work.
 */
import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { SportId, SportState } from '@/lib/types';
import { SPORTS } from '@/sports';
import { buildSport } from '@/data/generate';
import { isRecord, validSport } from './validate';

type Data = Partial<Record<SportId, SportState>>;
interface State {
  data: Data;
  retained: Record<string, unknown>;
  damaged: SportId[];
  unreadable: string | null;
  readFailed: boolean;
}
type Action =
  | { type: 'update'; sport: SportId; fn: (s: SportState) => SportState }
  | { type: 'reset'; sport: SportId }
  | { type: 'recover-all' };

const KEY = 'coachiq.v1';
export type StorageStatus = 'pending' | 'saved' | 'error' | 'recovery';

export function storageFeedback(status: StorageStatus): string {
  if (status === 'error') return 'Not saved to this browser — kept in this tab only';
  if (status === 'recovery') return 'Saving paused — saved data needs recovery';
  if (status === 'pending') return 'Saving to this browser…';
  return 'Saved in this browser';
}

function load(): State {
  const state: State = { data: {}, retained: {}, damaged: [], unreadable: null, readFailed: false };
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { ...state, readFailed: true };
  }
  if (raw === null) return state;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw, (_key, value: unknown) => {
      // JSON permits overflowing numeric literals. Stringifying those would
      // change them to null, so keep the original bytes for explicit recovery.
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite saved number');
      return value;
    });
  } catch {
    return { ...state, unreadable: raw };
  }
  if (!isRecord(parsed)) return { ...state, unreadable: raw };
  state.retained = { ...parsed };
  for (const sport of Object.keys(SPORTS) as SportId[]) {
    if (!Object.hasOwn(parsed, sport)) continue;
    if (validSport(parsed[sport], sport)) {
      state.data[sport] = parsed[sport];
      delete state.retained[sport];
    } else {
      state.damaged.push(sport);
    }
  }
  return state;
}

function reducer(state: State, a: Action): State {
  if (a.type === 'recover-all') return { ...state, unreadable: null };
  // An unreadable top-level snapshot must be explicitly released first.
  if (state.unreadable !== null || state.readFailed) return state;
  if (a.type === 'reset') {
    const retained = { ...state.retained };
    delete retained[a.sport];
    return {
      ...state, retained, damaged: state.damaged.filter((s) => s !== a.sport),
      data: { ...state.data, [a.sport]: buildSport(SPORTS[a.sport]) },
    };
  }
  if (state.damaged.includes(a.sport)) return state;
  return { ...state, data: { ...state.data, [a.sport]: a.fn(state.data[a.sport] ?? buildSport(SPORTS[a.sport])) } };
}

interface Ctx {
  data: Data;
  damaged: SportId[];
  unreadable: string | null;
  readFailed: boolean;
  recoveryCopy: (sport: SportId) => string;
  recoverAll: () => void;
  storageStatus: StorageStatus;
  retrySave: () => void;
  get: (s: SportId) => SportState;
  update: (s: SportId, fn: (st: SportState) => SportState) => void;
  reset: (s: SportId) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const { data, damaged, unreadable, readFailed } = state;
  const blocked = unreadable !== null || readFailed;
  const [retry, retrySave] = useReducer((n: number) => n + 1, 0);
  const [attempt, setAttempt] = useState<{ state: State; retry: number; status: StorageStatus } | null>(null);
  const storageStatus = blocked ? 'recovery'
    : attempt?.state === state && attempt.retry === retry ? attempt.status : 'pending';
  useEffect(() => {
    if (blocked) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state.retained, ...data }));
      setAttempt({ state, retry, status: 'saved' });
    } catch {
      setAttempt({ state, retry, status: 'error' });
    }
  }, [state, data, retry, blocked]);
  const cache = useMemo(() => new Map<SportId, SportState>(), []);
  const value = useMemo<Ctx>(
    () => ({
      data, damaged, unreadable, readFailed, storageStatus, retrySave,
      recoveryCopy: (sport) => JSON.stringify({ [sport]: state.retained[sport] }, null, 2),
      recoverAll: () => dispatch({ type: 'recover-all' }),
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
    [state, data, damaged, unreadable, readFailed, cache, storageStatus],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside provider');
  return c;
}
