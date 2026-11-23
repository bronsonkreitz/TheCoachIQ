import { StrictMode, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { SportId, SportState } from '@/lib/types';
import { StoreProvider } from '@/store/store';
import { SportProvider, useSport, type SportCtxValue } from '@/store/sport-context';

export const STORAGE_KEY = 'coachiq.v1';
export const SPORT_IDS: SportId[] = ['basketball', 'baseball', 'soccer', 'football', 'hockey'];

// localStorage's JSON format represents -0 as 0. Compare serialized snapshots,
// rather than treating the simulator's signed zero as lost coaching work.
export function jsonSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function savedSports(): Partial<Record<SportId, SportState>> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
}

/** Remount this harness to reload from localStorage, not from a retained context. */
export function mountSport(id: SportId, children?: ReactNode) {
  let current: SportCtxValue;
  function Capture() {
    current = useSport();
    return null;
  }
  function tree(sport: SportId) {
    return (
      <StrictMode>
        <StoreProvider>
          <SportProvider id={sport}>
            <Capture />
            {children}
          </SportProvider>
        </StoreProvider>
      </StrictMode>
    );
  }
  const view = render(tree(id));
  return {
    ...view,
    get current() { return current!; },
    switchSport: (sport: SportId) => view.rerender(tree(sport)),
  };
}
