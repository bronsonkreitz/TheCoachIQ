import { fireEvent, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Rotation } from './Basketball';
import { BattingOrder, PitchCount } from './Baseball';
import { SetPieces } from './Soccer';
import { DepthChart, FilmNotes, Playbook } from './Football';
import { Lines, ShotMap } from './Hockey';
import { mountSport, savedSports } from '@/test/persistence';

it('reloads basketball rotation edits and keeps an explicit clear', () => {
  const view = mountSport('basketball', <Rotation />);
  const input = screen.getAllByRole<HTMLInputElement>('spinbutton').find((el) => !el.disabled)!;
  const label = input.getAttribute('aria-label')!;
  fireEvent.change(input, { target: { value: '8' } });
  const rotation = savedSports().basketball!.tools['basketball.rotation'];
  expect(Object.values(rotation as Record<string, number[]>).some((q) => q[0] === 8)).toBe(true);
  view.unmount();
  const reloaded = mountSport('basketball', <Rotation />);
  expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('8');
  expect(reloaded.current.s.tools['basketball.rotation']).toEqual(rotation);
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  reloaded.unmount();
  mountSport('basketball', <Rotation />);
  expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('0');
});

it('reloads a manually reordered baseball batting order', () => {
  const view = mountSport('baseball', <BattingOrder />);
  fireEvent.click(screen.getByRole('button', { name: 'Auto rank order' }));
  const initial = [...view.current.s.tools['baseball.order'] as string[]];
  fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
  const order = view.current.s.tools['baseball.order'] as string[];
  expect(order.slice(0, 2)).toEqual([initial[1], initial[0]]);
  view.unmount();
  const reloaded = mountSport('baseball', <BattingOrder />);
  expect(reloaded.current.s.tools['baseball.order']).toEqual(order);
  const firstName = reloaded.current.roster.find((p) => p.id === order[0])!.name;
  expect(within(screen.getAllByRole('listitem')[0]).getByText(firstName)).toBeTruthy();
});

it('reloads manual baseball pitch logs and their deletion', () => {
  const view = mountSport('baseball', <PitchCount />);
  const pitcher = view.current.roster.find((p) => p.position === 'P')!;
  fireEvent.change(screen.getByRole('combobox', { name: 'Pitcher' }), { target: { value: pitcher.id } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-22' } });
  fireEvent.change(screen.getByLabelText('Pitches'), { target: { value: '42' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log outing' }));
  const logs = view.current.s.tools['baseball.pitchlog'];
  expect(logs).toEqual([expect.objectContaining({ pid: pitcher.id, pitches: 42, date: '2026-11-22' })]);
  view.unmount();
  const reloaded = mountSport('baseball', <PitchCount />);
  expect(screen.getByText('logged')).toBeTruthy();
  expect(reloaded.current.s.tools['baseball.pitchlog']).toEqual(logs);
  fireEvent.click(screen.getByRole('button', { name: 'Delete outing' }));
  reloaded.unmount();
  mountSport('baseball', <PitchCount />);
  expect(screen.queryByRole('button', { name: 'Delete outing' })).toBeNull();
});

it('reloads soccer set-piece assignments', () => {
  const view = mountSport('soccer', <SetPieces />);
  const select = screen.getAllByRole<HTMLSelectElement>('combobox')[0];
  const label = select.getAttribute('aria-label')!;
  const id = select.options[1].value;
  fireEvent.change(select, { target: { value: id } });
  const roles = view.current.s.tools['soccer.setpieces'];
  expect(Object.values(roles as object)).toContain(id);
  view.unmount();
  const reloaded = mountSport('soccer', <SetPieces />);
  expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe(id);
  expect(reloaded.current.s.tools['soccer.setpieces']).toEqual(roles);
});

it('reloads a football depth chart override', () => {
  const view = mountSport('football', <DepthChart />);
  const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'QB string 1' });
  const alternate = Array.from(select.options).find((o) => o.value && o.value !== select.value)!.value;
  fireEvent.change(select, { target: { value: alternate } });
  expect((view.current.s.tools['football.depth'] as Record<string, string[]>).QB[0]).toBe(alternate);
  view.unmount();
  mountSport('football', <DepthChart />);
  expect((screen.getByLabelText('QB string 1') as HTMLSelectElement).value).toBe(alternate);
});

it('reloads football playbook changes', () => {
  const view = mountSport('football', <Playbook />);
  // The calls field's accessible label includes the play name.
  const input = screen.getAllByRole<HTMLInputElement>('spinbutton')[0];
  const label = input.getAttribute('aria-label')!;
  fireEvent.change(input, { target: { value: '99' } });
  const plays = view.current.s.tools['football.plays'];
  expect(plays).toBeDefined();
  view.unmount();
  const reloaded = mountSport('football', <Playbook />);
  expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('99');
  expect(reloaded.current.s.tools['football.plays']).toEqual(plays);
});

it('reloads football film notes and persists deleting them', () => {
  const view = mountSport('football', <FilmNotes />);
  fireEvent.change(screen.getByLabelText('Timestamp mm:ss'), { target: { value: '01:23' } });
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Regression film note' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
  const notes = view.current.s.tools['football.film'];
  expect(notes).toEqual([expect.objectContaining({ ts: '01:23', note: 'Regression film note', tag: 'Offense' })]);
  view.unmount();
  const reloaded = mountSport('football', <FilmNotes />);
  expect(screen.getByText('Regression film note')).toBeTruthy();
  expect(reloaded.current.s.tools['football.film']).toEqual(notes);
  fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
  reloaded.unmount();
  mountSport('football', <FilmNotes />);
  expect(screen.queryByText('Regression film note')).toBeNull();
});

it('reloads hockey line assignments', () => {
  const view = mountSport('hockey', <Lines />);
  const select = screen.getAllByRole<HTMLSelectElement>('combobox')[0];
  const label = select.getAttribute('aria-label')!;
  const id = select.options[1].value;
  fireEvent.change(select, { target: { value: id } });
  const lines = view.current.s.tools['hockey.lines'];
  expect(Object.values(lines as object)).toContain(id);
  view.unmount();
  const reloaded = mountSport('hockey', <Lines />);
  expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe(id);
  expect(reloaded.current.s.tools['hockey.lines']).toEqual(lines);
});

it('reloads hockey shots and persists undoing the last shot', () => {
  const view = mountSport('hockey', <ShotMap />);
  const rink = screen.getByRole('img', { name: 'Interactive rink shot map' });
  // Supply geometry for the click coordinate conversion; jsdom has no layout.
  rink.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 85, width: 200, height: 85, toJSON() {} });
  fireEvent.click(rink, { clientX: 150, clientY: 40 });
  const shots = view.current.s.tools['hockey.shots'];
  expect(shots).toEqual([expect.objectContaining({ x: 150, y: 40, result: 'Save' })]);
  view.unmount();
  const reloaded = mountSport('hockey', <ShotMap />);
  expect(screen.getByText(/1 shots · 0 goals · 1 saved/)).toBeTruthy();
  expect(reloaded.current.s.tools['hockey.shots']).toEqual(shots);
  fireEvent.click(screen.getByRole('button', { name: 'Undo last' }));
  reloaded.unmount();
  mountSport('hockey', <ShotMap />);
  expect(screen.getByText(/0 shots · 0 goals · 0 saved/)).toBeTruthy();
});
