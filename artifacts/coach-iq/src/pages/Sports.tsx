import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { SPORT_LIST } from '@/sports';
import { imgUrl } from '@/lib/format';

export function SportCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {SPORT_LIST.map((s, i) => (
        <Link key={s.id} href={`/${s.id}`} data-testid={`card-sport-${s.id}`} className="lift rise group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl border border-border" style={{ animationDelay: `${i * 70}ms`, ['--sport' as string]: s.accent }}>
          <img src={imgUrl(s.image)} alt={`${s.name} illustration`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="relative p-5">
            <p className="font-display text-5xl font-black text-sport">{s.number}</p>
            <h3 className="font-display text-2xl font-black uppercase">{s.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.tagline}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sport">Open dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Sports() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Five sports. One playbook.</p>
      <h1 className="mb-8 font-display text-5xl font-black uppercase">Pick your sport</h1>
      <SportCards />
    </div>
  );
}
