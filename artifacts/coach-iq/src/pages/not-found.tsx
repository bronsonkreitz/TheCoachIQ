import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <p className="font-display text-8xl font-black text-primary">404</p>
      <h1 className="font-display text-3xl font-black uppercase">Off the field of play</h1>
      <p className="text-muted-foreground">That page or sport does not exist. Pick a sport and get back to work.</p>
      <div className="flex gap-3">
        <Link href="/sports" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Pick a sport</Link>
        <Link href="/" className="rounded-lg border border-border px-4 py-2 font-semibold">Home</Link>
      </div>
    </div>
  );
}
