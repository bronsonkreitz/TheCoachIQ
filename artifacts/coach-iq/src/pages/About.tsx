import { SCORE_RULES } from '@/sports/common';

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-14 sm:px-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">About</p>
        <h1 className="font-display text-5xl font-black uppercase">Built for the coach with a clipboard and no analyst</h1>
      </div>
      <p className="text-lg text-muted-foreground">CoachIQ turns box scores into decisions: who starts, what to drill, and where the season is slipping. Every number is derived from per-game lines, so the roster, charts, lineups and practice plans always agree.</p>
      <section>
        <h2 className="mb-3 font-display text-2xl font-bold uppercase">The scoring model</h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">{SCORE_RULES.map((r) => <li key={r}>{r}</li>)}</ol>
      </section>
      <section>
        <h2 className="mb-3 font-display text-2xl font-bold uppercase">Data and privacy</h2>
        <p className="text-muted-foreground">All teams, players and games are fictional and generated in your browser. Edits use localStorage on this device only when browser storage is available. If saving fails, a warning appears; keep this tab open to retain recent changes. Nothing is sent to a server.</p>
      </section>
      <p className="text-sm text-muted-foreground">A class project for ENTI 333.</p>
    </div>
  );
}
