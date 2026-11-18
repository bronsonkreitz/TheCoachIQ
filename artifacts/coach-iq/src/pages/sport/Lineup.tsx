import { useEffect, useMemo, useState } from 'react';
import { Save, Sparkles, Trash2, Upload } from 'lucide-react';
import { useSport } from '@/store/sport-context';
import { autoLineup, lineupScore, whyPlayer } from '@/lib/lineup';
import { uid } from '@/lib/rng';
import type { LineupSlot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Empty, NativeSelect, Panel, ScoringRules, Seg } from '@/components/coach/ui';
import { SurfaceDiagram } from '@/components/coach/Surface';
import { useToast } from '@/hooks/use-toast';

export default function Lineup() {
  const { cfg, s, scores, roster, update } = useSport();
  const { toast } = useToast();
  const formations = cfg.formations ? Object.keys(cfg.formations) : [];
  const [formation, setFormation] = useState(formations[0] ?? '');
  const slotDefs = cfg.formations ? cfg.formations[formation] : cfg.slots;
  const [excl, setExcl] = useState(true);
  const [slots, setSlots] = useState<LineupSlot[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Offense');
  const build = () => {
    const r = autoLineup(cfg, slotDefs, roster, scores, excl, cfg.id === 'soccer' ? 7 : 0);
    setSlots(r.slots);
    setNotes(r.notes);
    setBench(r.bench);
  };
  useEffect(build, [formation, excl, cfg.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const score = useMemo(() => lineupScore(slots, scores), [slots, scores]);
  const swap = (a: string, b: string) =>
    setSlots((ss) => {
      const ia = ss.findIndex((x) => x.slotId === a);
      const ib = ss.findIndex((x) => x.slotId === b);
      if (ia < 0 || ib < 0) return ss;
      const n = [...ss];
      const pa = n[ia].playerId;
      n[ia] = { ...n[ia], playerId: n[ib].playerId };
      n[ib] = { ...n[ib], playerId: pa };
      return n;
    });
  const assign = (slotId: string, pid: string) =>
    setSlots((ss) => {
      const other = ss.find((x) => x.playerId === pid);
      const cur = ss.find((x) => x.slotId === slotId)?.playerId ?? null;
      return ss.map((x) => (x.slotId === slotId ? { ...x, playerId: pid || null } : other && x.slotId === other.slotId ? { ...x, playerId: cur } : x));
    });
  const units = Array.from(new Set(slotDefs.map((d) => d.unit).filter(Boolean))) as string[];
  const shown = units.length ? slotDefs.filter((d) => d.unit === unit) : slotDefs;
  const pById = new Map(roster.map((p) => [p.id, p]));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">Data-driven</p>
          <h2 className="font-display text-3xl font-black uppercase">Lineup builder</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {formations.length > 0 && <Seg label="Formation" value={formation} onChange={setFormation} options={formations.map((f) => ({ value: f, label: f }))} />}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={excl} onCheckedChange={setExcl} data-testid="switch-exclude-injured" /> Exclude injured
          </label>
          <Button onClick={build} data-testid="button-auto-build">
            <Sparkles /> Auto-build lineup
          </Button>
        </div>
      </div>
      <ScoringRules sportRules={cfg.rules} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel kicker={`Lineup score ${score.toFixed(1)} / 100`} title="Diagram" actions={units.length ? <Seg label="Unit" size="sm" value={unit} onChange={setUnit} options={units.map((u) => ({ value: u, label: u }))} /> : undefined}>
          <SurfaceDiagram
            surface={cfg.surface}
            ariaLabel="Lineup diagram"
            onSwap={swap}
            tokens={shown.map((d) => ({ id: d.id, x: d.x, y: d.y, label: d.label, player: pById.get(slots.find((x) => x.slotId === d.id)?.playerId ?? '') }))}
          />
          <p className="mt-2 text-xs text-muted-foreground">Drag a player token onto another to swap, or use the dropdowns.</p>
          {notes.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {notes.map((n) => (
                <li key={n} className="rounded-lg bg-sport/10 px-3 py-1.5">{n}</li>
              ))}
            </ul>
          )}
          {bench.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Subs: {bench.map((id) => pById.get(id)?.name).join(', ')}
            </p>
          )}
        </Panel>
        <Panel title="Why each player" bodyClass="space-y-2 p-4">
          {slots.map((sl) => {
            const def = slotDefs.find((d) => d.id === sl.slotId)!;
            const p = sl.playerId ? pById.get(sl.playerId) : undefined;
            return (
              <div key={sl.slotId} className="rounded-xl border border-border bg-background/40 p-3" draggable onDragStart={(e) => e.dataTransfer.setData('text/slot', sl.slotId)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => swap(e.dataTransfer.getData('text/slot'), sl.slotId)}>
                <div className="flex items-center gap-2">
                  <span className="w-12 font-display font-bold text-sport">{sl.label}</span>
                  <NativeSelect aria-label={`Player for ${sl.label}`} className="flex-1" value={sl.playerId ?? ''} onChange={(e) => assign(sl.slotId, e.target.value)} data-testid={`select-slot-${sl.slotId}`}>
                    <option value="">Empty</option>
                    {roster
                      .filter((x) => def.positions.includes(x.position) && (!excl || x.status !== 'Injured'))
                      .sort((a, b) => (scores[b.id]?.score ?? 0) - (scores[a.id]?.score ?? 0))
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.position}) {scores[x.id]?.score.toFixed(1)}
                        </option>
                      ))}
                  </NativeSelect>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{p ? whyPlayer(cfg, p, scores[p.id], def) : 'No player assigned.'}</p>
              </div>
            );
          })}
        </Panel>
      </div>
      <Panel title="Saved lineups" actions={
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) { toast({ title: "Name the lineup first" }); return; }
          update((st) => ({ ...st, lineups: [...st.lineups, { id: uid('lu'), teamId: st.team.id, name: name.trim(), slots, score, createdAt: new Date().toISOString(), formation }] }));
          setName('');
          toast({ title: 'Lineup saved' });
        }}>
          <Input aria-label="Lineup name" placeholder="Lineup name" value={name} onChange={(e) => setName(e.target.value)} className="w-48" data-testid="input-lineup-name" />
          <Button type="submit" data-testid="button-save-lineup"><Save /> Save lineup</Button>
        </form>
      }>
        {s.lineups.length === 0 ? (
          <Empty title="No saved lineups" body="Build a lineup, name it and save it to compare later." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.lineups.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">Score {lineupScore(l.slots, scores).toFixed(1)} now (saved {l.score.toFixed(1)}){l.formation ? ` · ${l.formation}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" aria-label={`Load ${l.name}`} onClick={() => { if (l.formation) setFormation(l.formation); setTimeout(() => setSlots(l.slots), 0); }}><Upload /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${l.name}`} onClick={() => update((st) => ({ ...st, lineups: st.lineups.filter((x) => x.id !== l.id) }))}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
