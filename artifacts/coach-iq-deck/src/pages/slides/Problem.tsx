export default function Problem() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text grid grid-cols-12">
      <div className="col-span-5 bg-primary text-bg px-[4vw] py-[8vh] flex flex-col justify-between">
        <span className="font-mono text-[1.5vw] uppercase tracking-[0.12em]">The problem</span>
        <h2 className="font-display font-black uppercase text-[6.4vw] leading-[0.9] tracking-tight" style={{ textWrap: "balance" }}>Turn team numbers into coaching decisions</h2>
      </div>
      <div className="col-span-7 board-grid px-[5vw] py-[8vh] flex flex-col justify-center gap-[6vh]">
        <div className="border-t border-line pt-[3vh] grid grid-cols-[6vw_1fr] items-baseline">
          <span className="font-display font-black text-[4vw] text-primary leading-none">01</span>
          <p className="text-[2.4vw] leading-snug" style={{ textWrap: "pretty" }}>Coaches need to understand performance, select lineups, and plan practice</p>
        </div>
        <div className="border-t border-line pt-[3vh] grid grid-cols-[6vw_1fr] items-baseline">
          <span className="font-display font-black text-[4vw] text-primary leading-none">02</span>
          <p className="text-[2.4vw] leading-snug" style={{ textWrap: "pretty" }}>Player numbers are more useful when connected to the next decision</p>
        </div>
        <div className="border-t border-line pt-[3vh] grid grid-cols-[6vw_1fr] items-baseline">
          <span className="font-display font-black text-[4vw] text-primary leading-none">03</span>
          <p className="text-[2.4vw] leading-snug" style={{ textWrap: "pretty" }}>CoachIQ brings those tasks into one shared workflow</p>
        </div>
      </div>
    </div>
  );
}
