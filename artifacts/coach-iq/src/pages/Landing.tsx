import { Link } from 'wouter';
import { ArrowRight, BarChart3, ClipboardList, Shuffle, Users, Wrench, CalendarDays } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HashLink } from '@/components/layout/Site';
import { imgUrl } from '@/lib/format';
import { SportCards } from './Sports';

const FEATURES = [
  { icon: Users, t: 'Roster that thinks', d: 'Search, filter and sort every player. Each carries a 0-100 score built from position-weighted percentiles.' },
  { icon: BarChart3, t: 'Five chart types', d: 'Line, bar, radar, scatter and pie. Every chart flips to a table and exports to CSV.' },
  { icon: Shuffle, t: 'Auto lineups', d: 'Respects positions, injuries and team balance, then tells you why each player got the spot.' },
  { icon: ClipboardList, t: 'Practice that targets gaps', d: 'Your three weakest categories vs league benchmarks become timed drill blocks.' },
  { icon: CalendarDays, t: 'Game log', d: 'Full box scores. Add a result and every score, chart and plan updates.' },
  { icon: Wrench, t: 'Sport-specific tools', d: 'Shot zones, pitch counts, depth charts, line combos, set-piece takers and more.' },
];
const FAQ = [
  ['Is the data real?', 'No. Every team, player and game is fictional and generated in your browser for demonstration.'],
  ['Where are my edits saved?', 'In localStorage on this device. Use the reset button on any team to restore the original season.'],
  ['How is the player score calculated?', 'Each stat is ranked as a percentile among similar positions, weighted by position, blended 60% season and 40% last five games, then multiplied by availability.'],
  ['Can I override the auto lineup?', 'Yes. Swap players with dropdowns or by dragging tokens on the diagram, then save named lineups.'],
  ['Can I print a practice plan?', 'Yes. Generate a plan, then press Print for a clean sheet without the app chrome.'],
];

export default function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <img src={imgUrl('hero.jpg')} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div className="absolute inset-0 board-grid opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 sm:pt-32">
          <p className="rise text-xs font-semibold uppercase tracking-[0.3em] text-primary">Coaching analytics for five sports</p>
          <h1 className="rise mt-4 max-w-4xl font-display text-6xl font-black uppercase leading-[0.9] sm:text-8xl" style={{ animationDelay: '80ms' }}>
            Coach smarter.<br /><span className="text-primary">Win the details.</span>
          </h1>
          <p className="rise mt-6 max-w-xl text-lg text-muted-foreground" style={{ animationDelay: '160ms' }}>Box scores in. Lineups, practice plans and honest player scores out. No analyst required.</p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '240ms' }}>
            <HashLink to="how" testId="button-how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-6 py-3 font-semibold">See how it works</HashLink>
          </div>
        </div>
      </section>

      <section id="sports" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="mb-8 font-display text-4xl font-black uppercase">Pick your sport</h2>
        <SportCards />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="mb-8 font-display text-4xl font-black uppercase">Everything on one clipboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.t} className={`lift rounded-2xl border border-border bg-card p-6 ${i === 0 ? 'lg:row-span-2' : ''}`}>
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-xl font-bold uppercase">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="mb-10 font-display text-4xl font-black uppercase">How it works</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {[['Log the game', 'Enter a box score or simulate one. Team totals come straight from player lines.'], ['Read the scores', 'Percentiles, form and availability roll into one number per player.'], ['Act on it', 'Auto-build the lineup and generate a practice aimed at your three weakest areas.']].map(([t, d], i) => (
              <li key={t}>
                <span className="font-display text-7xl font-black text-primary/30">0{i + 1}</span>
                <h3 className="font-display text-2xl font-bold uppercase">{t}</h3>
                <p className="mt-2 text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="mb-6 font-display text-4xl font-black uppercase">Dashboard preview</h2>
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['Record', '8-4'], ['Pts / game', '71.6'], ['eFG%', '51.3%'], ['Top score', '82.4']].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs uppercase text-muted-foreground">{k}</p>
                <p className="font-display text-3xl font-black tabular">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-32 items-end gap-2">
            {[42, 61, 55, 73, 48, 80, 66, 90, 58, 77].map((h, i) => <div key={i} className="flex-1 rounded-t-md bg-primary/70" style={{ height: `${h}%` }} />)}
          </div>
          <Link href="/basketball" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">Open the live basketball dashboard <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="mb-6 font-display text-4xl font-black uppercase">FAQ</h2>
        <Accordion type="single" collapsible>
          {FAQ.map(([q, a], i) => (
            <AccordionItem key={q} value={`q${i}`}>
              <AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
