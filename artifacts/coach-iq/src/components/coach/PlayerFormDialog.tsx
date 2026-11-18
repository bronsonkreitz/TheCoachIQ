import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Player, Status } from '@/lib/types';
import { useSport } from '@/store/sport-context';
import { upsertPlayer } from '@/store/actions';
import { uid } from '@/lib/rng';
import { useToast } from '@/hooks/use-toast';
import { Field, NativeSelect } from './ui';

const schema = z.object({
  name: z.string().trim().min(3, 'Enter a first and last name').max(40).regex(/\s/, 'Enter a first and last name'),
  number: z.coerce.number().int('Whole number').min(0, '0 to 99').max(99, '0 to 99'),
  position: z.string().min(1, 'Pick a position'),
  status: z.enum(['Active', 'Questionable', 'Injured']),
  age: z.coerce.number().int().min(12, '12 to 40').max(40, '12 to 40'),
  height: z.string().regex(/^\d'\d{1,2}"$/, 'Use the format 6\'2"'),
  weight: z.coerce.number().int().min(90, '90 to 380 lb').max(380, '90 to 380 lb'),
  year: z.string().min(1, 'Pick a year'),
  notes: z.string().max(600).optional(),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

export function PlayerFormDialog({ open, onOpenChange, player }: { open: boolean; onOpenChange: (o: boolean) => void; player?: Player }) {
  const { cfg, s, update } = useSport();
  const { toast } = useToast();
  const blank: FormIn = { name: '', number: '', position: cfg.positions[0], status: 'Active', age: cfg.ageRange[0] + 1, height: `6'0"`, weight: 185, year: cfg.years[0], notes: '' } as unknown as FormIn;
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema), defaultValues: blank });
  useEffect(() => {
    if (open) form.reset(player ? { name: player.name, number: player.number, position: player.position, status: player.status, age: player.age, height: player.height, weight: player.weight, year: player.year, notes: player.notes } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player?.id]);
  const e = form.formState.errors;
  const submit = form.handleSubmit((v) => {
    const clash = s.players.find((p) => !p.removed && p.number === v.number && p.id !== player?.id);
    if (clash) {
      form.setError('number', { message: `#${v.number} is worn by ${clash.name}` });
      return;
    }
    const next: Player = player
      ? { ...player, ...v, status: v.status as Status, notes: v.notes ?? '' }
      : { id: uid(`${cfg.id.slice(0, 2)}-p`), teamId: s.team.id, gameStats: [], skill: 0.5, ...v, status: v.status as Status, notes: v.notes ?? '' };
    update((st) => upsertPlayer(st, next));
    toast({ title: player ? 'Player updated' : 'Player added', description: `${next.name} · #${next.number} · ${next.position}` });
    onOpenChange(false);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{player ? 'Edit player' : 'Add player'}</DialogTitle>
          <DialogDescription>{player ? 'Changes update scores, lineups and recommendations instantly.' : `New players start with no game lines. Add a game result to give them stats.`}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-6" noValidate>
          <Field label="Full name" htmlFor="pf-name" error={e.name?.message} className="sm:col-span-4">
            <Input id="pf-name" data-testid="input-player-name" aria-invalid={!!e.name} {...form.register('name')} />
          </Field>
          <Field label="Number" htmlFor="pf-num" error={e.number?.message} className="sm:col-span-2">
            <Input id="pf-num" type="number" inputMode="numeric" data-testid="input-player-number" aria-invalid={!!e.number} {...form.register('number')} />
          </Field>
          <Field label="Position" htmlFor="pf-pos" error={e.position?.message} className="sm:col-span-3">
            <NativeSelect id="pf-pos" className="w-full" data-testid="select-player-position" {...form.register('position')}>
              {cfg.positions.map((p) => (
                <option key={p} value={p}>
                  {p} — {cfg.positionNames[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Status" htmlFor="pf-status" className="sm:col-span-3">
            <NativeSelect id="pf-status" className="w-full" data-testid="select-player-status" {...form.register('status')}>
              {['Active', 'Questionable', 'Injured'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Age" htmlFor="pf-age" error={e.age?.message} className="sm:col-span-2">
            <Input id="pf-age" type="number" data-testid="input-player-age" {...form.register('age')} />
          </Field>
          <Field label="Height" htmlFor="pf-h" error={e.height?.message} className="sm:col-span-2">
            <Input id="pf-h" data-testid="input-player-height" placeholder={`6'2"`} {...form.register('height')} />
          </Field>
          <Field label="Weight (lb)" htmlFor="pf-w" error={e.weight?.message} className="sm:col-span-2">
            <Input id="pf-w" type="number" data-testid="input-player-weight" {...form.register('weight')} />
          </Field>
          <Field label="Year" htmlFor="pf-year" className="sm:col-span-6">
            <NativeSelect id="pf-year" className="w-full" data-testid="select-player-year" {...form.register('year')}>
              {cfg.years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Coach notes" htmlFor="pf-notes" className="sm:col-span-6">
            <Textarea id="pf-notes" rows={3} data-testid="input-player-notes" {...form.register('notes')} />
          </Field>
          <DialogFooter className="sm:col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" data-testid="button-save-player">
              {player ? 'Save changes' : 'Add player'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
