import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mountSport, savedSports } from '@/test/persistence';
import { PlayerFormDialog } from './PlayerFormDialog';

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

describe('player forms with the patched validation dependencies', () => {
  it('rejects invalid input, then coerces and persists a valid new player', async () => {
    const onOpenChange = vi.fn();
    const view = mountSport('basketball', <PlayerFormDialog open onOpenChange={onOpenChange} />);
    const originalCount = view.current.s.players.length;
    const occupied = new Set(view.current.s.players.filter((p) => !p.removed).map((p) => p.number));
    const number = Array.from({ length: 100 }, (_, n) => n).find((n) => !occupied.has(n))!;

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'A' } });
    fireEvent.click(screen.getByTestId('button-save-player'));
    await waitFor(() => expect(screen.getByText('Enter a first and last name')).toBeTruthy());
    expect(view.current.s.players).toHaveLength(originalCount);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Avery Example' } });
    fireEvent.change(screen.getByLabelText('Number'), { target: { value: String(number) } });
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Weight (lb)'), { target: { value: '190' } });
    fireEvent.click(screen.getByTestId('button-save-player'));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const player = savedSports().basketball!.players.find((p) => p.name === 'Avery Example')!;
    expect(player).toMatchObject({ number, age: 20, weight: 190, gameStats: [] });
    expect(typeof player.number).toBe('number');
    expect(view.current.s.players).toHaveLength(originalCount + 1);
  });
});
