import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPORT_LIST } from '@/sports';

/** In-page anchor that works from any route (scrolls on the landing page). */
export function HashLink({ to, className, children, testId }: { to: string; className?: string; children: ReactNode; testId?: string }) {
  const [loc, navigate] = useLocation();
  const id = to.split('#')[1];
  return (
    <a
      href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/#${id}`}
      className={className}
      data-testid={testId}
      onClick={(e) => {
        e.preventDefault();
        const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (loc === '/') go();
        else {
          navigate('/');
          setTimeout(go, 120);
        }
      }}
    >
      {children}
    </a>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group flex items-center gap-2', className)} data-testid="link-home">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-volt text-background transition-transform duration-300 group-hover:-rotate-6">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M4 18 L10 8 L14 14 L20 5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="5" r="2" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-2xl font-black uppercase leading-none tracking-tight">
        Coach<span className="text-volt">IQ</span>
      </span>
    </Link>
  );
}

const NAV = [
  { href: '/sports', label: 'Sports' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/about', label: 'How scoring works' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loc] = useLocation();
  useEffect(() => setOpen(false), [loc]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={cn('sticky top-0 z-50 border-b transition-colors duration-300', scrolled ? 'border-border/80 bg-background/85 backdrop-blur-xl' : 'border-transparent bg-background/40 backdrop-blur-sm')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-volt focus:px-3 focus:py-1.5 focus:text-background">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((n) =>
            n.href.includes('#') ? (
              <HashLink key={n.href} to={n.href} testId={`link-nav-${n.label.toLowerCase()}`} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {n.label}
              </HashLink>
            ) : (
              <Link key={n.href} href={n.href} data-testid={`link-nav-${n.label.toLowerCase().replace(/\s+/g, '-')}`} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {n.label}
              </Link>
            ),
          )}
          <span className="mx-2 h-5 w-px bg-border" />
          <div className="flex items-center gap-1">
            {SPORT_LIST.map((s) => (
              <Link
                key={s.id}
                href={`/${s.id}`}
                title={`${s.name} dashboard`}
                data-testid={`link-quick-${s.id}`}
                className={cn('grid h-8 w-8 place-items-center rounded-lg border border-border text-[10px] font-bold uppercase transition-all hover:-translate-y-0.5', loc.startsWith(`/${s.id}`) && 'border-transparent text-background')}
                style={loc.startsWith(`/${s.id}`) ? { background: s.hex } : { color: s.hex }}
              >
                {s.name.slice(0, 2)}
              </Link>
            ))}
          </div>
        </nav>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-border md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background/95 px-4 py-4 md:hidden" aria-label="Mobile">
          <div className="grid gap-1">
            {NAV.map((n) =>
              n.href.includes('#') ? (
                <HashLink key={n.href} to={n.href} className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">
                  {n.label}
                </HashLink>
              ) : (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">
                  {n.label}
                </Link>
              ),
            )}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {SPORT_LIST.map((s) => (
              <Link key={s.id} href={`/${s.id}`} className="rounded-lg border border-border py-2 text-center text-xs font-bold uppercase" style={{ color: s.hex }}>
                {s.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border bg-sidebar/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">Coach smarter. Win the details. Rosters, stats, explainable lineups and practice plans for five sports.</p>
          <p className="inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/10 px-3 py-1 text-xs font-semibold text-volt">ENTI 333 class project</p>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dashboards</p>
          <ul className="space-y-2 text-sm">
            {SPORT_LIST.map((s) => (
              <li key={s.id}>
                <Link href={`/${s.id}`} className="text-foreground/80 transition-colors hover:text-foreground" data-testid={`link-footer-${s.id}`}>
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Product</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/sports" className="text-foreground/80 hover:text-foreground">Sport picker</Link></li>
            <li><Link href="/about" className="text-foreground/80 hover:text-foreground">How scoring works</Link></li>
            <li><HashLink to="/#faq" className="text-foreground/80 hover:text-foreground">FAQ</HashLink></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Data notice</p>
          <p className="text-sm text-muted-foreground">Edits are saved in this browser only (localStorage). No accounts, no tracking, no live feeds.</p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <p data-testid="text-fictional-notice">All teams, players and stats shown are fictional demo data.</p>
          <p>CoachIQ — ENTI 333 class project.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0 });
  }, [loc]);
  return (
    <div className="grain flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
