import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildSport, DATA_VERSION } from '@/data/generate';
import { SPORTS } from '@/sports';
import { boxFor, removePlayer, upsertPlayer } from './actions';
import { teamAgg } from '@/lib/analytics';
import { useTool } from './sport-context';
import { jsonSnapshot, mountSport, savedSports, SPORT_IDS, STORAGE_KEY } from '@/test/persistence';

describe.each(SPORT_IDS)('%s browser-local persistence', (sport) => {
  it('reloads roster additions, edits, status, notes, lineups, plans, and tools without losing game data', () => {
    const view = mountSport(sport);
    const initial = jsonSnapshot(view.current.s);
    const player = initial.players[0];
    const drill = SPORTS[sport].drills[0];
    act(() => view.current.update((s) => {
      const edited = upsertPlayer(s, { ...player, name: 'Edited Demo', status: 'Questionable', notes: 'Work on footwork' });
      return {
        ...upsertPlayer(edited, { ...player, id: `${sport}-new`, name: 'New Demo', number: 0, gameStats: [] }),
        lineups: [{
          id: 'saved-lineup', teamId: s.team.id, name: 'Friday starters',
          slots: [{ slotId: 'first', label: player.position, position: player.position, playerId: player.id }],
          score: 81, formation: Object.keys(SPORTS[sport].formations ?? {})[0] ?? 'custom', createdAt: '2026-11-22T12:00:00Z',
        }],
        plans: [{
          id: 'saved-plan', teamId: s.team.id, name: 'Friday practice', lengthMin: 15,
          intensity: 'High', focusAreas: ['footwork'], completed: true,
          blocks: [{ uid: 'block-1', drillId: drill.id, minutes: 15, phase: drill.phase, done: true }],
          createdAt: '2026-11-22T12:00:00Z',
        }],
        tools: { [`${sport}.custom`]: { playerId: player.id, values: [0, 5, 10], note: 'Keep this' } },
      };
    }));
    const expected = jsonSnapshot(view.current.s);
    expect(savedSports()[sport]).toEqual(expected);
    view.unmount();
    const reloaded = mountSport(sport);
    expect(reloaded.current.s).toEqual(expected);
    expect(reloaded.current.roster).toHaveLength(initial.players.length + 1);
    expect(reloaded.current.s.players[0].gameStats).toEqual(player.gameStats);
    expect(reloaded.current.s.games).toEqual(initial.games);
  });

  it('keeps deleted players out of the roster and saved slots, but preserves historical box scores after reload', () => {
    const view = mountSport(sport);
    const initial = jsonSnapshot(view.current.s);
    const player = initial.players.find((p) => p.gameStats.length > 0)!;
    expect(player).toBeDefined();
    const boxes = initial.games.map((g) => boxFor(initial, g.id));
    const totals = teamAgg(initial);
    act(() => view.current.update((s) => ({
      ...s, lineups: [{
        id: 'history-lineup', teamId: s.team.id, name: 'Old starters', score: 72, createdAt: '2026-11-22',
        slots: [
          { slotId: 'first', label: 'First', position: player.position, playerId: player.id },
          { slotId: 'other', label: 'Other', position: s.players[1].position, playerId: s.players[1].id },
        ],
      }],
    })));
    act(() => view.current.update((s) => removePlayer(s, player.id)));
    view.unmount();
    const reloaded = mountSport(sport);
    expect(reloaded.current.roster.some((p) => p.id === player.id)).toBe(false);
    expect(reloaded.current.s.players.find((p) => p.id === player.id)).toEqual({ ...player, removed: true });
    expect(reloaded.current.s.lineups[0].slots.map((s) => s.playerId)).toEqual([null, initial.players[1].id]);
    expect(reloaded.current.s.games).toEqual(initial.games);
    expect(reloaded.current.s.games.map((g) => boxFor(reloaded.current.s, g.id))).toEqual(boxes);
    expect(teamAgg(reloaded.current.s)).toEqual(totals);
  });

  it('isolates edits when switching sports and resets only the selected sport, including after reload', () => {
    const view = mountSport(sport);
    const baseline = jsonSnapshot(view.current.s);
    for (const id of SPORT_IDS) {
      view.switchSport(id);
      act(() => view.current.update((s) => ({
        ...s, players: s.players.map((p) => ({ ...p, notes: `Private to ${id}` })),
        games: s.games.map((g) => ({ ...g, scoreAgainst: 123 })),
        lineups: [{ id: 'private-lineup', teamId: s.team.id, name: id, slots: [], score: 0, createdAt: '2026-11-22' }],
        plans: [{ id: 'private-plan', teamId: s.team.id, name: id, lengthMin: 60, intensity: 'High', focusAreas: [], blocks: [], createdAt: '2026-11-22' }],
        tools: { sharedKey: id },
      })));
      expect(view.current.id).toBe(id);
      expect(view.current.cfg.id).toBe(id);
      expect(view.current.s.team.sport).toBe(id);
    }
    const before = savedSports();
    for (const id of SPORT_IDS) {
      view.switchSport(id);
      expect(jsonSnapshot(view.current.s)).toEqual(before[id]);
    }
    view.switchSport(sport);
    act(() => view.current.reset());
    expect(jsonSnapshot(view.current.s)).toEqual(baseline);
    const expected = { ...before, [sport]: baseline };
    expect(savedSports()).toEqual(expected);
    view.unmount();
    const reloaded = mountSport(sport);
    for (const id of SPORT_IDS) {
      reloaded.switchSport(id);
      expect(reloaded.current.s).toEqual(expected[id]);
    }
  });
});

describe('storage initialization and failures', () => {
  it('does not persist untouched demo sports just by viewing them', () => {
    const view = mountSport('basketball');
    for (const id of SPORT_IDS) view.switchSport(id);
    expect(savedSports()).toEqual({});
  });

  it('preserves an outdated sport for recovery without erasing a current sport', () => {
    const basketball = buildSport(SPORTS.basketball);
    const soccer = buildSport(SPORTS.soccer);
    soccer.players[0].notes = 'Current saved note';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      basketball: { ...basketball, version: DATA_VERSION - 1 }, soccer,
    }));
    const view = mountSport('soccer');
    expect(view.current.s).toEqual(soccer);
    expect(savedSports()).toEqual(jsonSnapshot({ basketball: { ...basketball, version: DATA_VERSION - 1 }, soccer }));
    view.switchSport('basketball');
    expect(view.getByTestId('status-sport-recovery')).toBeTruthy();
  });

  it('preserves invalid JSON instead of overwriting it on mount', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json');
    const view = mountSport('soccer');
    expect(view.getByTestId('status-sport-recovery')).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken json');
  });

  it('keeps edits usable in memory when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const view = mountSport('hockey');
    act(() => view.current.update((s) => ({ ...s, tools: { note: 'In memory' } })));
    view.switchSport('soccer');
    view.switchSport('hockey');
    expect(view.current.s.tools).toEqual({ note: 'In memory' });
  });

  it('blocks sport views when storage cannot be read rather than risking saved work', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const view = mountSport('baseball');
    expect(view.getByTestId('status-sport-recovery')).toBeTruthy();
    expect(write).not.toHaveBeenCalled();
  });
});

it('persists multiple tool keys, supports clearing, and does not leak the same key between sports', () => {
  let first: ReturnType<typeof useTool<string[]>>;
  let second: ReturnType<typeof useTool<Record<string, number>>>;
  function Tools() {
    first = useTool('first', []);
    second = useTool('second', {});
    return null;
  }
  const view = mountSport('basketball', <Tools />);
  act(() => first[1](['saved']));
  act(() => second[1]({ count: 4 }));
  view.switchSport('hockey');
  expect(first![0]).toEqual([]);
  expect(second![0]).toEqual({});
  act(() => first[1](['hockey only']));
  view.switchSport('basketball');
  expect(first![0]).toEqual(['saved']);
  expect(second![0]).toEqual({ count: 4 });
  act(() => first[1]([]));
  view.unmount();
  mountSport('basketball', <Tools />);
  expect(first![0]).toEqual([]);
  expect(second![0]).toEqual({ count: 4 });
});
