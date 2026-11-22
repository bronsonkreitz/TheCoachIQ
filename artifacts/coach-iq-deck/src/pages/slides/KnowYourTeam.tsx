export default function KnowYourTeam() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg board-grid font-body text-text px-[6vw] py-[8vh] flex flex-col">
      <span className="font-mono text-[1.5vw] uppercase tracking-[0.12em] text-primary">Overview · Roster · Stats · Games</span>
      <h2 className="mt-[2vh] font-display font-black uppercase text-[6vw] leading-[0.9] tracking-tight max-w-[70vw]">Know your team before the next game</h2>
      <div className="mt-auto grid grid-cols-4 gap-[2.4vw]">
        <div className="border-t-[0.5vh] border-primary pt-[3vh]">
          <span className="font-display font-black uppercase text-[2.6vw] text-primary">Overview</span>
          <p className="mt-[1.6vh] text-[2vw] leading-snug">Review team trends, top performers, and weak areas</p>
        </div>
        <div className="border-t-[0.5vh] border-accent pt-[3vh]">
          <span className="font-display font-black uppercase text-[2.6vw] text-accent">Roster</span>
          <p className="mt-[1.6vh] text-[2vw] leading-snug">Search and edit rosters and player profiles</p>
        </div>
        <div className="border-t-[0.5vh] border-orange pt-[3vh]">
          <span className="font-display font-black uppercase text-[2.6vw] text-orange">Stats</span>
          <p className="mt-[1.6vh] text-[2vw] leading-snug">Compare players with charts and export statistics to CSV</p>
        </div>
        <div className="border-t-[0.5vh] border-violet pt-[3vh]">
          <span className="font-display font-black uppercase text-[2.6vw] text-violet">Games</span>
          <p className="mt-[1.6vh] text-[2vw] leading-snug">Record game results and review box scores</p>
        </div>
      </div>
    </div>
  );
}
