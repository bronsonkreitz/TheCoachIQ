import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Roster from './Roster';
import PlayerProfile from './PlayerProfile';
import Lineup from './Lineup';
import Practice from './Practice';
import { buildSport } from '@/data/generate';
import { SPORTS } from '@/sports';
import { jsonSnapshot, mountSport, savedSports, SPORT_IDS, STORAGE_KEY } from '@/test/persistence';
import { SportShell } from '@/components/coach/SportShell';

// Charts depend on real element sizes, which jsdom cannot calculate.
// Persistence controls and their providers are not mocked.
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: () => null,
}));

describe.each(SPORT_IDS)('%s saved coaching pages', (sport) => {
  it('saves a manual lineup change, reloads it, and keeps its deletion after another reload', async () => {
    const view = mountSport(sport, <Lineup />);
    const select = screen.getAllByRole<HTMLSelectElement>('combobox', { name: /^Player for / })[0];
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Lineup name' }), { target: { value: 'Regression starters' } });
    fireEvent.click(screen.getByTestId('button-save-lineup'));
    const saved = savedSports()[sport]!.lineups[0];
    expect(saved.name).toBe('Regression starters');
    expect(saved.slots.length).toBeGreaterThan(0);
    expect(saved.slots[0].playerId).toBeNull();
    view.unmount();

    const reloaded = mountSport(sport, <Lineup />);
    expect(screen.getByText('Regression starters')).toBeTruthy();
    expect(reloaded.current.s.lineups).toEqual([saved]);
    fireEvent.click(screen.getByRole('button', { name: 'Load Regression starters' }));
    await waitFor(() => {
      expect(screen.getAllByRole<HTMLSelectElement>('combobox', { name: /^Player for / }).map((s) => s.value))
        .toEqual(saved.slots.map((s) => s.playerId ?? ''));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete Regression starters' }));
    reloaded.unmount();
    const deleted = mountSport(sport, <Lineup />);
    expect(deleted.current.s.lineups).toEqual([]);
    expect(screen.queryByText('Regression starters')).toBeNull();
  });

  it('saves a practice plan, reloads completion changes, and persists deletion', () => {
    const view = mountSport(sport, <Practice />);
    fireEvent.click(screen.getByTestId('button-generate-plan'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Plan name' }), { target: { value: 'Regression practice' } });
    fireEvent.click(screen.getByTestId('button-save-plan'));
    const saved = savedSports()[sport]!.plans[0];
    expect(saved.name).toBe('Regression practice');
    expect(saved.blocks.length).toBeGreaterThan(0);
    view.unmount();

    const reloaded = mountSport(sport, <Practice />);
    expect(screen.getByText('Regression practice')).toBeTruthy();
    expect(reloaded.current.s.plans).toEqual([saved]);
    fireEvent.click(screen.getByRole('button', { name: 'Open plan' }));
    for (const button of screen.getAllByRole('button', { name: /^Mark .* complete$/ })) fireEvent.click(button);
    const completed = savedSports()[sport]!.plans[0];
    expect(completed.completed).toBe(true);
    expect(completed.blocks.every((b) => b.done)).toBe(true);
    reloaded.unmount();

    const finished = mountSport(sport, <Practice />);
    expect(screen.getByText('· Completed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open plan' }));
    expect(screen.getAllByRole('button', { name: /^Mark .* incomplete$/ })).toHaveLength(completed.blocks.length);
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));
    finished.unmount();
    const deleted = mountSport(sport, <Practice />);
    expect(deleted.current.s.plans).toEqual([]);
    expect(screen.queryByText('Regression practice')).toBeNull();
  });
});

it('persists roster form edits and coach notes using their actual save buttons', async () => {
  const user = userEvent.setup();
  const view = mountSport('basketball', <Roster />);
  const player = view.current.roster[0];
  await user.click(screen.getByTestId(`button-edit-${player.id}`));
  fireEvent.change(screen.getByTestId('input-player-name'), { target: { value: 'Regression Player' } });
  fireEvent.change(screen.getByTestId('select-player-status'), { target: { value: 'Injured' } });
  fireEvent.change(screen.getByTestId('input-player-notes'), { target: { value: 'Initial roster note' } });
  await user.click(screen.getByTestId('button-save-player'));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(savedSports().basketball!.players.find((p) => p.id === player.id)).toMatchObject({
    name: 'Regression Player', status: 'Injured', notes: 'Initial roster note',
  });
  view.unmount();

  const profile = mountSport('basketball', <PlayerProfile playerId={player.id} />);
  expect((screen.getByTestId('input-coach-notes') as HTMLTextAreaElement).value).toBe('Initial roster note');
  expect(profile.current.roster.find((p) => p.id === player.id)?.name).toBe('Regression Player');
  fireEvent.change(screen.getByTestId('input-coach-notes'), { target: { value: 'Updated from profile' } });
  fireEvent.click(screen.getByTestId('button-save-notes'));
  profile.unmount();
  const reloaded = mountSport('basketball', <PlayerProfile playerId={player.id} />);
  expect((screen.getByTestId('input-coach-notes') as HTMLTextAreaElement).value).toBe('Updated from profile');
  expect(reloaded.current.s.players.find((p) => p.id === player.id)?.gameStats).toEqual(player.gameStats);
  fireEvent.change(screen.getByTestId('input-coach-notes'), { target: { value: '' } });
  fireEvent.click(screen.getByTestId('button-save-notes'));
  reloaded.unmount();
  mountSport('basketball', <PlayerProfile playerId={player.id} />);
  expect((screen.getByTestId('input-coach-notes') as HTMLTextAreaElement).value).toBe('');
});

it('adds and removes a player through the roster without restoring them on reload', async () => {
  const user = userEvent.setup();
  const view = mountSport('basketball', <Roster />);
  const baseline = jsonSnapshot(buildSport(SPORTS.basketball));
  await user.click(screen.getByTestId('button-add-player'));
  fireEvent.change(screen.getByTestId('input-player-name'), { target: { value: 'New Regression' } });
  fireEvent.change(screen.getByTestId('input-player-number'), { target: { value: '0' } });
  await user.click(screen.getByTestId('button-save-player'));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  const added = view.current.roster.find((p) => p.name === 'New Regression')!;
  expect(added.gameStats).toEqual([]);
  view.unmount();
  const reloaded = mountSport('basketball', <Roster />);
  fireEvent.click(screen.getByTestId(`button-remove-${added.id}`));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByTestId('button-confirm-remove'));
  reloaded.unmount();
  const deleted = mountSport('basketball', <Roster />);
  expect(deleted.current.roster).toEqual(baseline.players);
  expect(deleted.current.s.players.find((p) => p.id === added.id)?.removed).toBe(true);
});

it.each(SPORT_IDS)('the %s reset confirmation resets only that sport, while cancel changes nothing', (sport) => {
  const initial = Object.fromEntries(SPORT_IDS.map((id) => {
    const state = buildSport(SPORTS[id]);
    state.players[0].notes = `Saved ${id} note`;
    state.tools = { saved: id };
    return [id, state];
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  const before = savedSports();
  const view = mountSport(sport, <SportShell sport={sport}><p>Dashboard content</p></SportShell>);
  fireEvent.click(screen.getByTestId('button-reset-data'));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
  expect(savedSports()).toEqual(before);
  fireEvent.click(screen.getByTestId('button-reset-data'));
  fireEvent.click(screen.getByTestId('button-confirm-reset'));
  const expected = { ...before, [sport]: jsonSnapshot(buildSport(SPORTS[sport])) };
  expect(savedSports()).toEqual(expected);
  view.unmount();
  const reloaded = mountSport(sport);
  expect(reloaded.current.s).toEqual(expected[sport]);
});
