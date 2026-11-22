const base = import.meta.env.BASE_URL;

export default function Practice() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text grid grid-cols-12">
      <div className="col-span-7 px-[6vw] py-[8vh] flex flex-col">
        <h2 className="font-display font-black uppercase text-[5.4vw] leading-[0.9] tracking-tight">Practice plans that target the gaps</h2>
        <div className="mt-[4vh] flex flex-col gap-[2.2vh] text-[2vw] leading-snug">
          <p>Compare team categories against configured demo benchmarks</p>
          <p className="text-primary font-medium">Prioritize the three weakest areas</p>
          <p>Adjust duration, intensity, and focus; save or print the plan</p>
        </div>
        <div className="mt-auto">
          <p className="text-[2vw] text-muted">Generate warm-up, skill, scrimmage, and cool-down blocks</p>
          <div className="mt-[1.6vh] flex h-[9vh] gap-[0.4vw] font-display font-black uppercase text-[2vw] text-bg">
            <div className="flex-[2] bg-accent rounded-l-[0.6vw] flex items-center px-[1vw]">Warm-up</div>
            <div className="flex-[4] bg-primary flex items-center px-[1vw]">Skill</div>
            <div className="flex-[3] bg-orange flex items-center px-[1vw]">Scrimmage</div>
            <div className="flex-[2] bg-violet rounded-r-[0.6vw] flex items-center px-[1vw]">Cool-down</div>
          </div>
        </div>
      </div>
      <div className="col-span-5 relative">
        <img src={`${base}soccer.jpg`} crossOrigin="anonymous" alt="Soccer practice" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg to-transparent" />
      </div>
    </div>
  );
}
