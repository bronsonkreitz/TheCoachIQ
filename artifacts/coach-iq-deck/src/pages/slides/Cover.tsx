const base = import.meta.env.BASE_URL;

export default function Cover() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <img src={`${base}hero.jpg`} crossOrigin="anonymous" alt="Night stadium" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
      <div className="relative h-full flex flex-col justify-between px-[6vw] py-[8vh]">
        <div className="flex items-center gap-[1vw]">
          <div className="w-[2.4vw] h-[2.4vw] rounded-[0.5vw] bg-primary flex items-center justify-center font-display font-black text-bg text-[1.6vw]">IQ</div>
          <span className="font-display font-extrabold text-[2vw] tracking-wide uppercase">CoachIQ</span>
        </div>
        <div>
          <h1 className="font-display font-black uppercase leading-[0.85] text-[13vw] tracking-tight">Coach<span className="text-primary">IQ</span></h1>
          <p className="mt-[2.4vh] font-display font-bold uppercase text-[4vw] leading-none text-primary">Coach smarter. Win the details.</p>
          <div className="mt-[5vh] flex items-center gap-[2.4vw] text-[2vw] text-muted">
            <span className="text-text font-medium">A five-sport coaching command center</span>
            <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
            <span className="font-mono text-[1.6vw] uppercase tracking-[0.1em]">ENTI 333 class project</span>
          </div>
        </div>
      </div>
    </div>
  );
}
