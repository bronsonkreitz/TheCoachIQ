import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { useSport } from '@/store/sport-context';
import { Panel, Seg } from '@/components/coach/ui';
import { Rotation, ShotChart } from './tools/Basketball';
import { BattingOrder, Bullpen, PitchCount } from './tools/Baseball';
import { Possession, SetPieces } from './tools/Soccer';
import { DepthChart, FilmNotes, Playbook } from './tools/Football';
import { IceTime, Lines, ShotMap } from './tools/Hockey';

export default function Tools() {
  const { cfg } = useSport();
  const q = new URLSearchParams(window.location.search).get('t');
  const [tool, setTool] = useState(cfg.tools.find((t) => t.id === q)?.id ?? cfg.tools[0].id);
  const meta = cfg.tools.find((t) => t.id === tool) ?? cfg.tools[0];
  const MAP: Record<string, ReactNode> = {
    shots: <ShotChart />,
    rotation: <Rotation />,
    order: <BattingOrder />,
    pitchcount: <PitchCount />,
    bullpen: <Bullpen />,
    formation: (
      <p className="text-sm text-muted-foreground">
        Formation diagrams (4-3-3, 4-4-2, 3-5-2 and more) with drag-to-swap live on the{' '}
        <Link href={`/${cfg.id}/lineup`} className="font-semibold text-sport underline">Lineup tab</Link>.
      </p>
    ),
    possession: <Possession />,
    setpieces: <SetPieces />,
    depth: <DepthChart />,
    plays: <Playbook />,
    film: <FilmNotes />,
    lines: <Lines />,
    shotmap: <ShotMap />,
    icetime: <IceTime />,
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sport">{cfg.name} only</p>
        <h2 className="font-display text-3xl font-black uppercase">Special tools</h2>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <Seg label="Tool" value={tool} onChange={setTool} options={cfg.tools.map((t) => ({ value: t.id, label: t.label }))} />
      </div>
      <Panel kicker="Saved automatically" title={meta.label}>
        <p className="mb-4 text-sm text-muted-foreground">{meta.desc}</p>
        {MAP[tool] ?? <p className="text-sm text-muted-foreground">Tool not available.</p>}
      </Panel>
    </div>
  );
}
