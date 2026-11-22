export default function Lineups() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body text-text px-[6vw] py-[8vh] flex flex-col">
      <h2 className="font-display font-black uppercase text-[5.4vw] leading-[0.9] tracking-tight">Lineups with <span className="text-primary">visible reasoning</span></h2>
      <div className="mt-[5vh] flex h-[16vh] rounded-[0.8vw] overflow-hidden">
        <div className="w-[60%] bg-primary text-bg px-[2vw] flex items-center justify-between">
          <span className="font-display font-black text-[9vw] leading-none">60%</span>
          <span className="font-display font-bold uppercase text-[2.4vw]">Season performance</span>
        </div>
        <div className="w-[40%] bg-accent text-bg px-[2vw] flex items-center justify-between">
          <span className="font-display font-black text-[9vw] leading-none">40%</span>
          <span className="font-display font-bold uppercase text-[2.4vw]">Recent form</span>
        </div>
      </div>
      <p className="mt-[2vh] text-[2vw] text-muted">Blend 60% season performance with 40% recent form</p>
      <div className="mt-auto grid grid-cols-4 gap-[1.6vw]">
        <div className="border-l border-line pl-[1.2vw]">
          <span className="font-mono text-[1.5vw] text-primary">01</span>
          <p className="mt-[1vh] text-[2vw] leading-snug">Normalize player statistics into team percentiles</p>
        </div>
        <div className="border-l border-line pl-[1.2vw]">
          <span className="font-mono text-[1.5vw] text-primary">02</span>
          <p className="mt-[1vh] text-[2vw] leading-snug">Weight performance by position</p>
        </div>
        <div className="border-l border-line pl-[1.2vw]">
          <span className="font-mono text-[1.5vw] text-primary">03</span>
          <p className="mt-[1vh] text-[2vw] leading-snug">Adjust for availability, then fit players to eligible positions</p>
        </div>
        <div className="border-l border-line pl-[1.2vw]">
          <span className="font-mono text-[1.5vw] text-primary">04</span>
          <p className="mt-[1vh] text-[2vw] leading-snug">Review explanations, make swaps, and save lineups</p>
        </div>
      </div>
    </div>
  );
}
