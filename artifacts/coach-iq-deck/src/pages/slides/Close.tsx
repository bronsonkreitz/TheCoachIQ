const base = import.meta.env.BASE_URL;

export default function Close() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text">
      <img src={`${base}hockey.jpg`} crossOrigin="anonymous" alt="Hockey rink" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/40" />
      <div className="relative h-full px-[6vw] py-[8vh] grid grid-cols-12 gap-[2vw]">
        <div className="col-span-7 flex flex-col justify-between">
          <h2 className="font-display font-black uppercase text-[6vw] leading-[0.9] tracking-tight">From numbers to the next coaching action</h2>
          <div>
            <p className="font-display font-black uppercase text-[7vw] leading-none">Coach<span className="text-primary">IQ</span></p>
            <p className="mt-[1vh] font-display font-bold uppercase text-[3vw] text-primary">Coach smarter. Win the details.</p>
          </div>
        </div>
        <div className="col-span-5 flex flex-col justify-center gap-[3.2vh]">
          <div className="flex gap-[1.2vw] items-baseline"><span className="font-display font-black text-[3vw] text-primary leading-none">1</span><p className="text-[2vw] leading-snug">Pick a sport and review the team overview</p></div>
          <div className="flex gap-[1.2vw] items-baseline"><span className="font-display font-black text-[3vw] text-primary leading-none">2</span><p className="text-[2vw] leading-snug">Compare players and auto-build a lineup</p></div>
          <div className="flex gap-[1.2vw] items-baseline"><span className="font-display font-black text-[3vw] text-primary leading-none">3</span><p className="text-[2vw] leading-snug">Generate a practice plan around the weakest areas</p></div>
          <div className="flex gap-[1.2vw] items-baseline"><span className="font-display font-black text-[3vw] text-primary leading-none">4</span><p className="text-[2vw] leading-snug">Save the work and return to it in the same browser</p></div>
        </div>
      </div>
    </div>
  );
}
