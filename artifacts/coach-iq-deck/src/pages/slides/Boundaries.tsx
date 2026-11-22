export default function Boundaries() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text px-[6vw] py-[8vh] flex flex-col">
      <h2 className="font-display font-black uppercase text-[5.4vw] leading-[0.9] tracking-tight">A working demo with <span className="text-primary">clear boundaries</span></h2>
      <div className="mt-[6vh] flex-1 grid grid-cols-12 gap-[2vw]">
        <div className="col-span-5 flex flex-col gap-[3vh] pt-[3vh] border-t-[0.5vh] border-green">
          <span className="font-mono text-[1.6vw] uppercase tracking-[0.12em] text-green">How it works</span>
          <p className="text-[2.2vw] leading-snug">React and TypeScript with shared sport configurations</p>
          <p className="text-[2.2vw] leading-snug">Charts and recommendations derive from fictional team data</p>
        </div>
        <div className="col-span-7 flex flex-col gap-[3vh] pt-[3vh] border-t-[0.5vh] border-orange">
          <span className="font-mono text-[1.6vw] uppercase tracking-[0.12em] text-orange">Out of scope</span>
          <p className="text-[2.2vw] leading-snug">Browser-local saving; no accounts or cross-device syncing</p>
          <p className="text-[2.2vw] leading-snug">No live sports feeds or real team data</p>
        </div>
      </div>
      <div className="bg-primary text-bg rounded-[0.8vw] px-[2.4vw] py-[3vh]">
        <p className="font-display font-black uppercase text-[3vw] leading-none">All teams, players, and stats shown are fictional demo data</p>
      </div>
    </div>
  );
}
