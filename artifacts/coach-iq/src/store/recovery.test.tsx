import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildSport } from '@/data/generate';
import { SPORTS } from '@/sports';
import type { SportId, SportState } from '@/lib/types';
import { StorageNotice } from '@/components/coach/StorageNotice';
import { StoreProvider, useStore } from './store';
import { SportProvider } from './sport-context';
import { validSport } from './validate';
import { jsonSnapshot, SPORT_IDS, STORAGE_KEY } from '@/test/persistence';

function mountRecovery(sport: SportId = 'basketball') {
  let store: ReturnType<typeof useStore>;
  function Capture() {
    store = useStore();
    return null;
  }
  const view = render(
    <StrictMode>
      <StoreProvider>
        <Capture />
        <StorageNotice />
        <SportProvider id={sport}><p>Healthy sport view</p></SportProvider>
      </StoreProvider>
    </StrictMode>,
  );
  return { ...view, get store() { return store!; } };
}

const corruptions: [string, (s: SportState) => unknown][] = [
  ['missing players', (s) => ({ ...s, players: undefined })],
  ['null players', (s) => ({ ...s, players: null })],
  ['invalid player', (s) => ({ ...s, players: [null] })],
  ['invalid player name', (s) => ({ ...s, players: [{ ...s.players[0], name: 42 }] })],
  ['invalid status', (s) => ({ ...s, players: [{ ...s.players[0], status: 'unknown' }] })],
  ['wrong position', (s) => ({ ...s, players: [{ ...s.players[0], position: 'not-a-position' }] })],
  ['missing game stats', (s) => ({ ...s, players: [{ ...s.players[0], gameStats: null }] })],
  ['invalid raw stats', (s) => ({ ...s, players: [{ ...s.players[0], gameStats: [{ gameId: 'x', s: { pts: '5' } }] }] })],
  ['missing games', (s) => ({ ...s, games: undefined })],
  ['invalid game', (s) => ({ ...s, games: [null] })],
  ['invalid team totals', (s) => ({ ...s, games: [{ ...s.games[0], teamStats: [] }] })],
  ['invalid extra stats', (s) => ({ ...s, games: [{ ...s.games[0], extra: { value: null } }] })],
  ['invalid team', (s) => ({ ...s, team: null })],
  ['wrong sport', (s) => ({ ...s, team: { ...s.team, sport: 'other' } })],
  ['invalid upcoming', (s) => ({ ...s, upcoming: [null] })],
  ['missing lineups', (s) => ({ ...s, lineups: undefined })],
  ['invalid lineup slots', (s) => ({ ...s, lineups: [{ id: 'l', teamId: s.team.id, name: 'Test', score: 1, createdAt: '', slots: [null] }] })],
  ['missing plans', (s) => ({ ...s, plans: undefined })],
  ['invalid plan blocks', (s) => ({ ...s, plans: [{ id: 'p', teamId: s.team.id, name: 'Test', lengthMin: 5, intensity: 'High', focusAreas: [], createdAt: '', blocks: [null] }] })],
  ['unknown drill', (s) => ({ ...s, plans: [{ id: 'p', teamId: s.team.id, name: 'Test', lengthMin: 5, intensity: 'High', focusAreas: [], createdAt: '', blocks: [{ uid: 'b', drillId: 'missing', minutes: 5, phase: 'skill', done: false }] }] })],
  ['missing tools', (s) => ({ ...s, tools: undefined })],
  ['null tools', (s) => ({ ...s, tools: null })],
  ['array tools', (s) => ({ ...s, tools: [] })],
];

describe.each(SPORT_IDS)('%s damaged saved data', (sport) => {
  it.each(corruptions)('isolates %s and preserves healthy neighboring edits through reload', (_label, corrupt) => {
    const bad = jsonSnapshot(corrupt(buildSport(SPORTS[sport])));
    const neighbor = sport === 'soccer' ? 'hockey' : 'soccer';
    const good = buildSport(SPORTS[neighbor]);
    good.players[0].notes = 'Keep healthy work';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [sport]: bad, [neighbor]: good }));
    const view = mountRecovery(sport);
    expect(screen.queryByText('Healthy sport view')).toBeNull();
    expect(view.store.damaged).toEqual([sport]);
    expect(view.store.get(neighbor)).toEqual(jsonSnapshot(good));
    act(() => view.store.update(neighbor, (s) => ({ ...s, tools: { healthy: true } })));
    // Even programmatic edits cannot replace quarantined work.
    act(() => view.store.update(sport, (s) => ({ ...s, tools: { overwritten: true } })));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved[sport]).toEqual(bad);
    expect(saved[neighbor].tools).toEqual({ healthy: true });
    const copy = screen.getByTestId(`link-recovery-copy-${sport}`).getAttribute('href')!;
    expect(JSON.parse(decodeURIComponent(copy.split(',')[1]))).toEqual({ [sport]: bad });
    view.unmount();
    const reloaded = mountRecovery(neighbor);
    expect(screen.getByText('Healthy sport view')).toBeTruthy();
    expect(reloaded.store.damaged).toEqual([sport]);
    expect(reloaded.store.get(neighbor).tools).toEqual({ healthy: true });
  });
});

it.each([
  ['basketball', 'basketball.rotation', { player: [1] }],
  ['baseball', 'baseball.order', {}],
  ['baseball', 'baseball.pitchlog', [null]],
  ['soccer', 'soccer.setpieces', { corner: [] }],
  ['football', 'football.depth', { QB: 'wrong' }],
  ['football', 'football.plays', [{ name: 'No fields' }]],
  ['football', 'football.film', [{ ts: 12 }]],
  ['hockey', 'hockey.lines', { line: 1 }],
  ['hockey', 'hockey.shots', [{ result: 'Wrong' }]],
] as const)('quarantines malformed %s tool %s', (sport, key, value) => {
  const s = buildSport(SPORTS[sport]);
  s.tools[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ [sport]: s }));
  const view = mountRecovery(sport);
  expect(view.store.damaged).toEqual([sport]);
  expect(screen.queryByText('Healthy sport view')).toBeNull();
});

it('requires confirmation and resets only the damaged sport', () => {
  const good = buildSport(SPORTS.soccer);
  good.players[0].notes = 'Keep this note';
  const bad = { version: 3, players: null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ basketball: bad, soccer: good }));
  const view = mountRecovery();
  fireEvent.click(screen.getByTestId('button-recover-basketball'));
  fireEvent.click(screen.getByTestId('button-cancel-recovery'));
  expect(view.store.damaged).toEqual(['basketball']);
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).basketball).toEqual(bad);
  fireEvent.click(screen.getByTestId('button-recover-basketball'));
  fireEvent.click(screen.getByTestId('button-confirm-recovery'));
  expect(screen.getByText('Healthy sport view')).toBeTruthy();
  expect(view.store.damaged).toEqual([]);
  expect(view.store.get('soccer')).toEqual(good);
  view.unmount();
  const reloaded = mountRecovery();
  expect(reloaded.store.get('basketball')).toEqual(jsonSnapshot(buildSport(SPORTS.basketball)));
  expect(reloaded.store.get('soccer')).toEqual(good);
});

it.each(['null', '[]', '42', '"text"', '{broken json', ''])('retains unreadable root %j until explicit reset', (raw) => {
  localStorage.setItem(STORAGE_KEY, raw);
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const view = mountRecovery();
  expect(write).not.toHaveBeenCalled();
  expect(view.store.storageStatus).toBe('recovery');
  const copy = screen.getByTestId('link-recovery-copy-all').getAttribute('href')!;
  expect(decodeURIComponent(copy.split(',')[1])).toBe(raw);
  act(() => view.store.update('soccer', (s) => ({ ...s, tools: { attempt: true } })));
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  fireEvent.click(screen.getByTestId('button-recover-all'));
  fireEvent.click(screen.getByTestId('button-confirm-recovery'));
  expect(screen.getByText('Healthy sport view')).toBeTruthy();
  expect(view.store.storageStatus).toBe('saved');
  act(() => view.store.update('basketball', (s) => ({ ...s, tools: { recovered: true } })));
  view.unmount();
  expect(mountRecovery().store.get('basketball').tools).toEqual({ recovered: true });
});

it('does not write or offer destructive recovery when browser reads fail', () => {
  localStorage.setItem(STORAGE_KEY, '{"keep":"original"}');
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const view = mountRecovery();
  act(() => view.store.update('soccer', (s) => s));
  expect(write).not.toHaveBeenCalled();
  expect(screen.getByTestId('button-retry-reading')).toBeTruthy();
  expect(screen.queryByTestId('button-recover-all')).toBeNull();
  read.mockRestore();
  expect(localStorage.getItem(STORAGE_KEY)).toBe('{"keep":"original"}');
});

it('retains unknown entries and rejects non-finite numeric values from valid JSON', () => {
  const s = buildSport(SPORTS.basketball);
  const raw = JSON.stringify({ basketball: s, future: { keep: true } }).replace('"version":3', '"version":1e400');
  localStorage.setItem(STORAGE_KEY, raw);
  const view = mountRecovery();
  expect(view.store.unreadable).toBe(raw);
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
});

it('retains unknown entries when healthy sports are edited', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ future: { keep: true } }));
  const view = mountRecovery();
  act(() => view.store.update('soccer', (s) => ({ ...s, tools: { edit: true } })));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).future).toEqual({ keep: true });
});

it.each(SPORT_IDS)('accepts legitimate empty collections and optional fields for %s', (sport) => {
  const s = buildSport(SPORTS[sport]);
  expect(validSport(s, sport)).toBe(true);
  expect(validSport({ ...s, players: [], games: [], upcoming: [], lineups: [], plans: [], tools: { extension: null } }, sport)).toBe(true);
});
