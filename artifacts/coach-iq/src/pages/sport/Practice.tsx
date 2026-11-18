import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Printer, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import { useSport } from '@/store/sport-context';
import { generatePlan } from '@/lib/practice';
import { fmt } from '@/lib/format';
import { uid } from '@/lib/rng';
import type { Intensity, PlanBlock } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Empty, NativeSelect, Panel, ScoringRules, Seg } from '@/components/coach/ui';
import { useToast } from '@/hooks/use-toast';

const PHASE: Record<string, string> = { warmup: 'Warm-up', skill: 'Skill block', scrimmage: 'Scrimmage', cooldown: 'Cool-down' };

export default function Practice() {
  const { cfg, s, benches, update } = useSport();
  const { toast } = useToast();
  const [len, setLen] = useState(90);
  const [intensity, setIntensity] = useState<Intensity>('Medium');
  const [focus, setFocus] = useState<string[]>(benches.slice(0, 3).map((b) => b.bench.key));
  const [blocks, setBlocks] = useState<PlanBlock[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('all');
  const drill = (id: string) => cfg.drills.find((d) => d.id === id)!;
  const gen = () => {
    const rows = benches.filter((b) => focus.includes(b.bench.key)).sort((a, b) => a.index - b.index);
    setBlocks(generatePlan(cfg, { lengthMin: len, intensity, focus: rows }));
    setPlanId(null);
  };
  const total = blocks.reduce((a, b) => a + b.minutes, 0);
  const done = blocks.filter((b) => b.done).length;
  const toggle = (uidv: string) => {
    const nb = blocks.map((b) => (b.uid === uidv ? { ...b, done: !b.done } : b));
    setBlocks(nb);
    if (planId) update((st) => ({ ...st, plans: st.plans.map((p) => (p.id === planId ? { ...p, blocks: nb, completed: nb.every((b) => b.done) } : p)) }));
  };
  const tags = Array.from(new Set(cfg.drills.flatMap((d) => d.focusTags)));
  let clock = 0;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">Targets the gaps</p>
        <h2 className="font-display text-3xl font-black uppercase">Practice planner</h2>
      </div>
      <ScoringRules mode="practice" />
      <div className="grid gap-3 md:grid-cols-3">
        {benches.slice(0, 3).map((b, i) => (
          <div key={b.bench.key} className="rounded-2xl border border-bad/30 bg-bad/[0.06] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-bad">Weakness #{i + 1}</p>
            <p className="font-display text-xl font-bold uppercase">{b.bench.label}</p>
            <p className="text-sm text-muted-foreground">Team {fmt(b.value, b.bench.fmt)} vs league {fmt(b.bench.league, b.bench.fmt)} · index {b.index}</p>
          </div>
        ))}
      </div>
      <Panel title="Plan settings" className="no-print">
        <div className="grid gap-5 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold">Length: <span className="tabular text-sport">{len} min</span></p>
              <Slider aria-label="Practice length" min={45} max={150} step={15} value={[len]} onValueChange={(v) => setLen(v[0])} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Focus areas (max 3)</p>
              <div className="flex flex-wrap gap-2">
                {benches.map((b) => {
                  const on = focus.includes(b.bench.key);
                  return (
                    <button key={b.bench.key} aria-pressed={on} onClick={() => setFocus((f) => (on ? f.filter((x) => x !== b.bench.key) : [...f, b.bench.key].slice(-3)))} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', on ? 'border-sport bg-sport text-background' : 'border-border text-muted-foreground hover:text-foreground')}>
                      {b.bench.label} · {b.index}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3">
            <Seg label="Intensity" value={intensity} onChange={(v) => setIntensity(v as Intensity)} options={(['Low', 'Medium', 'High'] as const).map((v) => ({ value: v, label: v }))} />
            <Button onClick={gen} disabled={!focus.length} data-testid="button-generate-plan"><Sparkles /> Generate practice plan</Button>
          </div>
        </div>
      </Panel>
      <Panel kicker={blocks.length ? `${total} min · ${done}/${blocks.length} complete` : undefined} title="Plan timeline" className="print-area" actions={blocks.length ? (
        <div className="no-print flex flex-wrap gap-2">
          <Input aria-label="Plan name" placeholder="Plan name" value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
          <Button size="sm" onClick={() => {
            const id = planId ?? uid('pl');
            const plan = { id, teamId: s.team.id, name: name.trim() || `Practice ${new Date().toLocaleDateString()}`, lengthMin: total, intensity, focusAreas: focus, blocks, createdAt: new Date().toISOString(), completed: blocks.every((b) => b.done) };
            update((st) => ({ ...st, plans: [...st.plans.filter((p) => p.id !== id), plan] }));
            setPlanId(id);
            toast({ title: 'Plan saved' });
          }} data-testid="button-save-plan"><Save /> Save</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} data-testid="button-print-plan"><Printer /> Print</Button>
        </div>
      ) : undefined}>
        {!blocks.length ? (
          <Empty title="No plan yet" body="Pick focus areas and press Generate practice plan." />
        ) : (
          <ol className="space-y-2">
            {blocks.map((b) => {
              const d = drill(b.drillId);
              const start = clock;
              clock += b.minutes;
              return (
                <li key={b.uid} className={cn('flex gap-3 rounded-xl border p-3', b.done ? 'border-good/40 bg-good/[0.05]' : 'border-border')}>
                  <button onClick={() => toggle(b.uid)} aria-label={`Mark ${d.name} ${b.done ? 'incomplete' : 'complete'}`} className="mt-0.5 shrink-0">
                    {b.done ? <CheckCircle2 className="h-5 w-5 text-good" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular text-xs text-muted-foreground">{start}-{clock}′</span>
                      <span className="rounded bg-muted px-1.5 text-[10px] font-bold uppercase">{PHASE[b.phase]}</span>
                      <p className={cn('font-semibold', b.done && 'line-through opacity-60')}>{d.name}</p>
                      {b.focus && <span className="text-xs text-sport">Focus: {b.focus}</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{d.instructions}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{d.intensity} intensity · {d.equipment.join(', ')}</p>
                  </div>
                  <span className="font-display text-xl font-bold tabular">{b.minutes}′</span>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] no-print">
        <Panel title="Saved plans">
          {!s.plans.length ? <p className="text-sm text-muted-foreground">No saved plans yet.</p> : (
            <ul className="space-y-2">
              {s.plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="font-semibold">{p.name} {p.completed && <span className="text-xs text-good">· Completed</span>}</p>
                    <p className="text-xs text-muted-foreground">{p.lengthMin} min · {p.intensity} · {p.blocks.filter((b) => b.done).length}/{p.blocks.length} done</p>
                  </div>
                  <div className="flex">
                    <Button size="sm" variant="ghost" aria-label="Open plan" onClick={() => { setBlocks(p.blocks); setPlanId(p.id); setName(p.name); }}><Upload /></Button>
                    <Button size="sm" variant="ghost" aria-label="Delete plan" onClick={() => update((st) => ({ ...st, plans: st.plans.filter((x) => x.id !== p.id) }))}><Trash2 /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Drill library (${cfg.drills.length})`} actions={
          <NativeSelect aria-label="Filter drills" value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="all">All focus tags</option>
            {tags.map((t) => <option key={t}>{t}</option>)}
          </NativeSelect>
        }>
          <ul className="grid gap-2 sm:grid-cols-2">
            {cfg.drills.filter((d) => tag === 'all' || d.focusTags.includes(tag)).map((d) => (
              <li key={d.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{d.name}</p>
                  <button aria-label={`Add ${d.name} to plan`} className="text-sport" onClick={() => setBlocks((b) => [...b, { uid: uid('b'), drillId: d.id, minutes: d.durationMin, phase: d.phase, done: false }])}><Plus className="h-4 w-4" /></button>
                </div>
                <p className="text-xs text-muted-foreground">{d.durationMin} min · {d.intensity} · {d.focusTags.join(', ')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d.equipment.join(', ')}</p>
                <p className="mt-1 text-xs">{d.instructions}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
