import { useLayoutEffect } from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStore, type StorageStatus } from './store';
import { mountSport, savedSports, STORAGE_KEY } from '@/test/persistence';
import { StorageNotice } from '@/components/coach/StorageNotice';
import { SiteFooter } from '@/components/layout/Site';
import PlayerProfile from '@/pages/sport/PlayerProfile';
import Tools from '@/pages/sport/Tools';
import Lineup from '@/pages/sport/Lineup';
import Practice from '@/pages/sport/Practice';
import { ManualStatsDialog } from '@/components/coach/ManualStatsDialog';
import { GameDetailDialog } from '@/components/coach/GameDialogs';
import { useSport } from './sport-context';

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: () => null,
}));

function captureStore(statuses: StorageStatus[] = []) {
  let current: ReturnType<typeof useStore>;
  function Capture() {
    current = useStore();
    const status = current.storageStatus;
    // Observe the committed status before the persistence effect runs.
    useLayoutEffect(() => { statuses.push(status); }, [status]);
    return <StorageNotice />;
  }
  return { Capture, get current() { return current!; } };
}

describe('browser save status', () => {
  it.each(['QuotaExceededError', 'SecurityError'])('warns on %s without blocking editing or switching sports', (name) => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Cannot save', name); });
    const store = captureStore();
    const view = mountSport('basketball', <><store.Capture /><SiteFooter /></>);
    expect(store.current.storageStatus).toBe('error');
    expect(screen.getByRole('status').textContent).toContain('Changes are not saved');
    expect(screen.getByRole('status').textContent).toContain('reload or close');
    expect(screen.queryByText(/^Saved in this browser/)).toBeNull();
    act(() => view.current.update((s) => ({ ...s, tools: { note: 'Still editable' } })));
    view.switchSport('soccer');
    act(() => view.current.update((s) => ({ ...s, tools: { note: 'Another sport' } })));
    view.switchSport('basketball');
    expect(view.current.s.tools.note).toBe('Still editable');
    expect(store.current.storageStatus).toBe('error');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('reports pending for each changed snapshot, not a stale successful save', () => {
    const statuses: StorageStatus[] = [];
    const store = captureStore(statuses);
    const view = mountSport('soccer', <store.Capture />);
    expect(store.current.storageStatus).toBe('saved');
    statuses.length = 0;
    act(() => view.current.update((s) => ({ ...s, tools: { count: 1 } })));
    expect(statuses).toEqual(['pending', 'saved']);
    expect(savedSports().soccer?.tools.count).toBe(1);
  });

  it('keeps the last saved snapshot on failure and retries all latest sport edits', () => {
    const store = captureStore();
    const view = mountSport('basketball', <store.Capture />);
    act(() => view.current.update((s) => ({ ...s, tools: { count: 1 } })));
    const previous = localStorage.getItem(STORAGE_KEY);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    act(() => view.current.update((s) => ({ ...s, tools: { count: 2 } })));
    view.switchSport('hockey');
    act(() => view.current.update((s) => ({ ...s, tools: { count: 3 } })));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(previous);
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    expect(store.current.storageStatus).toBe('error');
    write.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    expect(store.current.storageStatus).toBe('saved');
    expect(screen.getByRole('status').textContent).toBe('');
    expect(savedSports().basketball?.tools.count).toBe(2);
    expect(savedSports().hockey?.tools.count).toBe(3);
    view.unmount();
    const reloaded = mountSport('basketball');
    expect(reloaded.current.s.tools.count).toBe(2);
    reloaded.switchSport('hockey');
    expect(reloaded.current.s.tools.count).toBe(3);
  });

  it('recovers on the next edit without requiring a retry or reload', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    const store = captureStore();
    const view = mountSport('football', <store.Capture />);
    act(() => view.current.update((s) => ({ ...s, tools: { first: true } })));
    write.mockRestore();
    act(() => view.current.update((s) => ({ ...s, tools: { ...s.tools, second: true } })));
    expect(store.current.storageStatus).toBe('saved');
    expect(savedSports().football?.tools).toEqual({ first: true, second: true });
    expect(screen.queryByRole('button', { name: 'Retry saving' })).toBeNull();
  });

  it('does not pretend a failed edit survived a reload', () => {
    const view = mountSport('baseball');
    act(() => view.current.update((s) => ({ ...s, tools: { note: 'Persisted' } })));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    act(() => view.current.update((s) => ({ ...s, tools: { note: 'Only in tab' } })));
    expect(view.current.s.tools.note).toBe('Only in tab');
    view.unmount();
    const store = captureStore();
    const reloaded = mountSport('baseball', <store.Capture />);
    expect(reloaded.current.s.tools.note).toBe('Persisted');
    expect(store.current.storageStatus).toBe('error');
  });
});

describe('accurate save feedback', () => {
  it('does not claim manual stats were saved when storage fails', () => {
    const close = vi.fn();
    mountSport('basketball', <ManualStatsDialog initialView="team" onClose={close} />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    fireEvent.click(screen.getByTestId('button-save-manual-stats'));
    expect(close).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenLastCalledWith({
      title: 'Manual stats updated',
      description: 'Stats, team charts and recommendations have been updated. Check the browser save status for persistence.',
    });
    expect(savedSports().basketball).toBeUndefined();
  });

  it('does not claim a box score was saved when storage fails', () => {
    const close = vi.fn();
    function Detail() {
      const { s } = useSport();
      return <GameDetailDialog game={s.games[0]} onOpenChange={close} />;
    }
    const view = mountSport('basketball', <Detail />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    fireEvent.click(screen.getByTestId('button-edit-box'));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Opponent score' }), { target: { value: '123' } });
    fireEvent.click(screen.getByTestId('button-save-box'));
    expect(view.current.s.games[0].scoreAgainst).toBe(123);
    expect(toast).toHaveBeenLastCalledWith({ title: 'Box score updated', description: 'Season stats, scores and charts recalculated.' });
    expect(savedSports().basketball).toBeUndefined();
  });

  it('shows notes as tab-only after a failed save, then confirms only a successful retry', () => {
    const view = mountSport('basketball');
    const playerId = view.current.roster[0].id;
    view.unmount();
    const store = captureStore();
    mountSport('basketball', <><store.Capture /><PlayerProfile playerId={playerId} /></>);
    expect(screen.getByText('Saved in this browser')).toBeTruthy();
    // The first failed write happens after a successful initial save, so using
    // the pre-update status in a save toast would incorrectly report success.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    fireEvent.change(screen.getByTestId('input-coach-notes'), { target: { value: 'Unsaved observation' } });
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    fireEvent.click(screen.getByTestId('button-save-notes'));
    expect(screen.getByText('Not saved to this browser — kept in this tab only')).toBeTruthy();
    expect(screen.queryByText('Saved in this browser')).toBeNull();
    expect(toast).toHaveBeenLastCalledWith({ title: 'Notes updated' });
    vi.restoreAllMocks();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    expect(screen.getByText('Saved in this browser')).toBeTruthy();
    expect(savedSports().basketball?.players.find((p) => p.id === playerId)?.notes).toBe('Unsaved observation');
  });

  it('does not claim automatic tool saving while storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    mountSport('basketball', <Tools />);
    expect(screen.getByText('Not saved to this browser — kept in this tab only')).toBeTruthy();
    expect(screen.queryByText('Saved automatically')).toBeNull();
  });

  it.each([
    { Page: Lineup, prepare: () => {}, name: 'Lineup name', saveId: 'button-save-lineup', title: 'Lineup added' },
    { Page: Practice, prepare: () => fireEvent.click(screen.getByTestId('button-generate-plan')), name: 'Plan name', saveId: 'button-save-plan', title: 'Plan added' },
  ])('uses neutral feedback for $name when the first edit fails', ({ Page, prepare, name, saveId, title }) => {
    const view = mountSport('basketball', <Page />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    prepare();
    fireEvent.change(screen.getByRole('textbox', { name }), { target: { value: 'Tab-only work' } });
    fireEvent.click(screen.getByTestId(saveId));
    expect(screen.getByText('Tab-only work')).toBeTruthy();
    expect(toast).toHaveBeenLastCalledWith({ title, description: 'Check the browser save status for persistence.' });
    expect(savedSports().basketball).toBeUndefined();
    expect(view.current.s.lineups.length + view.current.s.plans.length).toBe(1);
  });
});
